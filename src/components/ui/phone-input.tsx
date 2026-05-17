import { useState, useEffect, useRef } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Input } from './input';
import { cn } from '@/lib/utils';

type Country = {
  code: string;
  ddi: string;
  flag: string;
  name: string;
  minLocal: number;
  maxLocal: number;
};

const COUNTRIES: Country[] = [
  { code: 'BR', ddi: '55',  flag: '🇧🇷', name: 'Brasil',       minLocal: 10, maxLocal: 11 },
  { code: 'US', ddi: '1',   flag: '🇺🇸', name: 'EUA/Canadá',   minLocal: 10, maxLocal: 10 },
  { code: 'PT', ddi: '351', flag: '🇵🇹', name: 'Portugal',      minLocal: 9,  maxLocal: 9  },
  { code: 'AR', ddi: '54',  flag: '🇦🇷', name: 'Argentina',     minLocal: 8,  maxLocal: 10 },
  { code: 'UY', ddi: '598', flag: '🇺🇾', name: 'Uruguai',       minLocal: 8,  maxLocal: 8  },
  { code: 'PY', ddi: '595', flag: '🇵🇾', name: 'Paraguai',      minLocal: 8,  maxLocal: 9  },
  { code: 'BO', ddi: '591', flag: '🇧🇴', name: 'Bolívia',       minLocal: 7,  maxLocal: 8  },
  { code: 'CL', ddi: '56',  flag: '🇨🇱', name: 'Chile',         minLocal: 8,  maxLocal: 9  },
  { code: 'CO', ddi: '57',  flag: '🇨🇴', name: 'Colômbia',      minLocal: 8,  maxLocal: 10 },
  { code: 'MX', ddi: '52',  flag: '🇲🇽', name: 'México',        minLocal: 8,  maxLocal: 10 },
  { code: 'ES', ddi: '34',  flag: '🇪🇸', name: 'Espanha',       minLocal: 9,  maxLocal: 9  },
  { code: 'IT', ddi: '39',  flag: '🇮🇹', name: 'Itália',        minLocal: 9,  maxLocal: 11 },
  { code: 'DE', ddi: '49',  flag: '🇩🇪', name: 'Alemanha',      minLocal: 10, maxLocal: 12 },
  { code: 'GB', ddi: '44',  flag: '🇬🇧', name: 'Reino Unido',   minLocal: 9,  maxLocal: 10 },
  { code: 'FR', ddi: '33',  flag: '🇫🇷', name: 'França',        minLocal: 9,  maxLocal: 9  },
  { code: 'JP', ddi: '81',  flag: '🇯🇵', name: 'Japão',         minLocal: 9,  maxLocal: 10 },
  { code: 'CN', ddi: '86',  flag: '🇨🇳', name: 'China',         minLocal: 10, maxLocal: 11 },
  { code: 'AU', ddi: '61',  flag: '🇦🇺', name: 'Austrália',     minLocal: 8,  maxLocal: 9  },
];

// Sorted longest-DDI first for unambiguous matching
const SORTED_FOR_PARSE = [...COUNTRIES].sort((a, b) => b.ddi.length - a.ddi.length);

const BR = COUNTRIES.find(c => c.code === 'BR')!;

function parseValue(raw: string): { country: Country; localDigits: string } {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return { country: BR, localDigits: '' };

  // Brazil with explicit DDI: 55 + 10-11 local digits = 12-13 total
  if (digits.startsWith('55') && digits.length >= 12 && digits.length <= 13) {
    return { country: BR, localDigits: digits.slice(2) };
  }

  // Try DDIs with length >= 2 (skip 1-digit to avoid ambiguity with BR numbers)
  for (const country of SORTED_FOR_PARSE.filter(c => c.ddi.length >= 2 && c.code !== 'BR')) {
    if (digits.startsWith(country.ddi)) {
      const local = digits.slice(country.ddi.length);
      if (local.length >= country.minLocal && local.length <= country.maxLocal) {
        return { country, localDigits: local };
      }
    }
  }

  // 1-digit DDI (+1 US/Canada): only match if total is exactly 11 digits AND
  // the remaining 10 digits look like a NANP number (area code 2xx-9xx)
  if (digits.startsWith('1') && digits.length === 11) {
    const areaCode = parseInt(digits.slice(1, 4));
    if (areaCode >= 200 && areaCode <= 999) {
      const US = COUNTRIES.find(c => c.code === 'US')!;
      return { country: US, localDigits: digits.slice(1) };
    }
  }

  // Default: treat as Brazilian local (no DDI prefix)
  return { country: BR, localDigits: digits.slice(0, BR.maxLocal) };
}

function formatBR(digits: string): string {
  const d = digits.slice(0, 11);
  if (!d) return '';
  if (d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);
  if (!rest) return `(${ddd}) `;
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  if (d.length <= 10) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
}

function formatUS(digits: string): string {
  const d = digits.slice(0, 10);
  if (!d) return '';
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

function formatPT(digits: string): string {
  const d = digits.slice(0, 9);
  if (!d) return '';
  return d.replace(/(\d{3})(\d{3})(\d{0,3})/, (_, a, b, c) =>
    c ? `${a} ${b} ${c}` : b ? `${a} ${b}` : a
  );
}

function formatGeneric(digits: string, max: number): string {
  const d = digits.slice(0, max);
  return d.replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatLocal(country: Country, localDigits: string): string {
  switch (country.code) {
    case 'BR': return formatBR(localDigits);
    case 'US': return formatUS(localDigits);
    case 'PT': return formatPT(localDigits);
    default:   return formatGeneric(localDigits, country.maxLocal);
  }
}

export function formatPhoneDisplay(stored: string): string {
  if (!stored) return '';
  const { country, localDigits } = parseValue(stored);
  const formatted = formatLocal(country, localDigits);
  return country.code === 'BR' ? formatted : `+${country.ddi} ${formatted}`;
}

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  required?: boolean;
  className?: string;
}

export function PhoneInput({ value, onChange, id, required, className }: PhoneInputProps) {
  const parsed = parseValue(value);
  const [country, setCountry] = useState<Country>(parsed.country);
  const [localDigits, setLocalDigits] = useState(parsed.localDigits);
  const prevValue = useRef(value);

  useEffect(() => {
    if (value !== prevValue.current) {
      prevValue.current = value;
      const p = parseValue(value);
      setCountry(p.country);
      setLocalDigits(p.localDigits);
    }
  }, [value]);

  const emit = (ddi: string, local: string) => {
    const stored = local ? ddi + local : '';
    prevValue.current = stored;
    onChange(stored);
  };

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '').slice(0, country.maxLocal);
    setLocalDigits(raw);
    emit(country.ddi, raw);
  }

  function handleCountryChange(code: string) {
    const next = COUNTRIES.find(c => c.code === code) ?? country;
    const clamped = localDigits.slice(0, next.maxLocal);
    setCountry(next);
    setLocalDigits(clamped);
    emit(next.ddi, clamped);
  }

  const placeholder = country.code === 'BR' ? '(11) 98765-4321'
    : country.code === 'US' ? '(212) 555-1234'
    : 'Número';

  return (
    <div className={cn('flex gap-2', className)}>
      <Select value={country.code} onValueChange={handleCountryChange}>
        <SelectTrigger className="w-[108px] shrink-0 px-2">
          <SelectValue>
            <span className="flex items-center gap-1.5 text-sm">
              <span>{country.flag}</span>
              <span className="text-muted-foreground">+{country.ddi}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {COUNTRIES.map(c => (
            <SelectItem key={c.code} value={c.code}>
              <span className="flex items-center gap-2">
                <span>{c.flag}</span>
                <span className="font-mono text-xs text-muted-foreground w-8">+{c.ddi}</span>
                <span>{c.name}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        id={id}
        type="tel"
        inputMode="numeric"
        value={formatLocal(country, localDigits)}
        onChange={handlePhoneChange}
        required={required}
        placeholder={placeholder}
        className="flex-1"
      />
    </div>
  );
}
