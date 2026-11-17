export function Star({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m12 0 2.8 9.2L24 12l-9.2 2.8L12 24l-2.8-9.2L0 12l9.2-2.8L12 0Z" fill="currentColor" />
    </svg>
  );
}

export function Mascot({ className = '' }: { className?: string }) {
  return <img src="/mascot.svg" className={`mascot ${className}`} alt="구름새 몽이" draggable={false} />;
}
