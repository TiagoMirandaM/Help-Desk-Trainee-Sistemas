export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="page-header">
      <div className="page-header__titles">
        {eyebrow ? <span className="page-header__eyebrow">{eyebrow}</span> : null}
        <h1 className="page-header__title">{title}</h1>
        {description ? <p className="page-header__description">{description}</p> : null}
      </div>
      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </div>
  );
}
