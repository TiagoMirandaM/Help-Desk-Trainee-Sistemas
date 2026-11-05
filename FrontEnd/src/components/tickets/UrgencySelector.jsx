import { URGENCIES, URGENCY_LABELS } from '../../utils/constants.js';
import './tickets.css';

export function UrgencySelector({
  value,
  onChange,
  error,
  register,
  name = 'urgency',
  idPrefix = 'urgency',
  label = 'Urgência',
  required = true,
  requiredMessage = 'Selecione a urgência do chamado.',
  disabled = false,
}) {
  const registration = register
    ? register(name, {
        required: requiredMessage,
      })
    : null;

  return (
    <fieldset className="urgency-field" disabled={disabled}>
      <legend className="field__label">
        {label}
        {required ? (
          <span className="field__required" aria-hidden="true">
            *
          </span>
        ) : null}
      </legend>
      <div className="urgency-options">
        {URGENCIES.map((urgency) => {
          const inputProps = registration
            ? registration
            : {
                checked: value === urgency,
                onChange: () => onChange?.(urgency),
              };

          return (
            <label
              key={urgency}
              className={`urgency-option ${value === urgency ? 'is-selected' : ''}`.trim()}
            >
              <input
                type="radio"
                name={name}
                value={urgency}
                id={`${idPrefix}-${urgency.toLowerCase()}`}
                disabled={disabled}
                {...inputProps}
              />
              <span
                className={`urgency-option__dot urgency-option__dot--${urgency.toLowerCase()}`}
                aria-hidden="true"
              />
              <span>{URGENCY_LABELS[urgency]}</span>
            </label>
          );
        })}
      </div>
      {error ? (
        <p className="field__error" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
