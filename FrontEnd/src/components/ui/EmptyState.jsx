import './ui.css';

export function EmptyState({ icon: Icon, title, description, action, compact = false }) {
  return (
    <div className={`empty-state ${compact ? 'empty-state--compact' : ''}`.trim()}>
      {Icon ? (
        <span className="empty-state__icon" aria-hidden="true">
          <Icon size={compact ? 20 : 24} />
        </span>
      ) : null}
      <h3 className="empty-state__title">{title}</h3>
      {description ? <p className="empty-state__description">{description}</p> : null}
      {action ? <div className="empty-state__action">{action}</div> : null}
    </div>
  );
}
