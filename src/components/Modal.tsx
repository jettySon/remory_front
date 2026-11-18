import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function ModalLayer({
  closing,
  onExited,
  children,
}: {
  closing: boolean;
  onExited: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="modal-layer"
      data-closing={closing || undefined}
      inert={closing}
      onAnimationEnd={(event) => {
        // The dimmer finishes even if saving removed the dialog's content.
        if (closing && event.target === event.currentTarget && event.animationName === 'modal-dimmer-out') {
          onExited();
        }
      }}
    >
      {children}
    </div>
  );
}

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const backdrop = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cb = (e: KeyboardEvent) => {
      const layer = backdrop.current;
      if (e.key === 'Escape' && !e.defaultPrevented && layer && !layer.closest('[inert]')) onClose();
    };
    window.addEventListener('keydown', cb);
    return () => window.removeEventListener('keydown', cb);
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      ref={backdrop}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-handle" />
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="닫기">
            <X size={21} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
