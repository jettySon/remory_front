import { ChevronRight } from 'lucide-react';

export function SectionHeading({
  title,
  action,
  onClick,
}: {
  title: string;
  action?: string;
  onClick?: () => void;
}) {
  return (
    <div className="section-heading">
      <h3>{title}</h3>
      {action && (
        <button className="subtle-action" onClick={onClick}>
          {action}
          <ChevronRight size={15} />
        </button>
      )}
    </div>
  );
}
