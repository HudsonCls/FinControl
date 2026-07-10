import { formatBRL } from '@/lib/format';
import { usePrivacy } from '@/context/PrivacyContext';

/**
 * Renderiza um valor em reais respeitando o modo privacidade: quando ativo,
 * mostra "R$ ••••" no lugar do número. Herda cor/estilo do elemento pai.
 */
export function Money({ value }: { value: number }) {
  const { hidden } = usePrivacy();
  if (hidden) {
    return (
      <span aria-label="valor oculto" title="Valores ocultos">
        R$&nbsp;••••
      </span>
    );
  }
  return <>{formatBRL(value)}</>;
}
