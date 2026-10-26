-- C4 (parte 2): buckets de fotos, documentos e comprovantes passam a ser privados.
-- APLICAR SOMENTE DEPOIS de publicar o front-end que usa links assinados (src/lib/storageUrl.ts).
-- Antes disso, as imagens e anexos deixam de abrir.
-- Para desfazer: update storage.buckets set public = true where id in (...mesmos ids...);
update storage.buckets
set public = false
where id in ('patient-photos', 'patient-documents', 'transaction-attachments');
