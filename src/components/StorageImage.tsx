import { useEffect, useState, type ImgHTMLAttributes } from 'react';
import { signStorageUrl } from '@/lib/storageUrl';

type StorageImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & { src?: string | null };

// <img> para arquivos de buckets privados: assina a URL antes de exibir.
export function StorageImage({ src, alt = '', ...props }: StorageImageProps) {
  const [signed, setSigned] = useState<string>();

  useEffect(() => {
    let active = true;
    setSigned(undefined);
    if (src) signStorageUrl(src).then((url) => { if (active) setSigned(url); });
    return () => { active = false; };
  }, [src]);

  if (!signed) return null;
  return <img src={signed} alt={alt} {...props} />;
}
