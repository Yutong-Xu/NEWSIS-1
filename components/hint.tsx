import { Info } from 'lucide-react';

export function Hint({ text }: { text: string }) {
  return (
    <span className="hint" tabIndex={0} role="img" aria-label={text} data-tip={text}>
      <Info size={13} aria-hidden="true" />
    </span>
  );
}
