-- Adicionar valor ao enum notification_type (necessário para notificações de erro de WhatsApp)
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'erro_whatsapp';

-- Recriar função com casts corretos para os enums do Postgres
CREATE OR REPLACE FUNCTION create_session_with_installments(
  p_patient_id         UUID,
  p_date               TIMESTAMPTZ,
  p_type               TEXT,
  p_session_type       TEXT,
  p_notes              TEXT,
  p_amount             NUMERIC,
  p_payment_status     TEXT,
  p_payment_method     TEXT,
  p_next_appointment   TIMESTAMPTZ,
  p_professional_id    UUID,
  p_installments_count INT,
  p_first_payment_date TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id         UUID;
  v_installment_amount NUMERIC;
  v_predicted_date     TIMESTAMPTZ;
  v_installments       JSONB := '[]'::JSONB;
  i                    INT;
BEGIN
  -- 1. Inserir lançamento (casts explícitos para colunas enum)
  INSERT INTO sessions (
    patient_id, date, type, session_type, status, notes,
    amount, payment_status, payment_method, next_appointment, professional_id
  ) VALUES (
    p_patient_id,
    p_date,
    p_type,
    p_session_type::session_type,
    'sugerido'::appointment_status,
    p_notes,
    p_amount,
    p_payment_status::payment_status,
    p_payment_method,
    p_next_appointment,
    p_professional_id
  )
  RETURNING id INTO v_session_id;

  -- 2. Criar parcelas (se parcelado)
  IF p_installments_count > 1 AND p_first_payment_date IS NOT NULL THEN
    v_installment_amount := p_amount / p_installments_count;

    FOR i IN 0..(p_installments_count - 1) LOOP
      v_predicted_date := p_first_payment_date + (i || ' months')::INTERVAL;

      INSERT INTO installments (
        session_id, installment_number, total_installments,
        amount, predicted_date, paid
      ) VALUES (
        v_session_id, i + 1, p_installments_count,
        v_installment_amount, v_predicted_date, FALSE
      );
    END LOOP;

    SELECT jsonb_agg(jsonb_build_object(
      'id',                 id,
      'session_id',         session_id,
      'installment_number', installment_number,
      'total_installments', total_installments,
      'amount',             amount,
      'predicted_date',     predicted_date,
      'paid',               paid,
      'created_at',         created_at
    ))
    INTO v_installments
    FROM installments
    WHERE session_id = v_session_id;
  END IF;

  -- 3. Criar transação financeira se pagamento à vista
  IF p_payment_status = 'pago' AND p_amount > 0 AND (p_installments_count IS NULL OR p_installments_count <= 1) THEN
    INSERT INTO transactions (
      type, description, amount, date, category, patient_id, session_id
    ) VALUES (
      'entrada'::transaction_type,
      'Pagamento - ' || p_type,
      p_amount,
      p_date,
      'Consulta',
      p_patient_id,
      v_session_id
    );
  END IF;

  RETURN jsonb_build_object(
    'session_id',   v_session_id,
    'installments', COALESCE(v_installments, '[]'::JSONB)
  );
END;
$$;
