import './ui.css';

export function Badge({ tone = 'neutral', children, icon: Icon, dot = false, className = '' }) {
  return (
    <span className={`badge badge--${tone} ${className}`.trim()}>
      {dot ? <span className="badge__dot" aria-hidden="true" /> : null}
      {Icon ? <Icon size={12} aria-hidden="true" /> : null}
      <span>{children}</span>
    </span>
  );
}
