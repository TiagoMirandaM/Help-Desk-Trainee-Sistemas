import { forwardRef, useId } from 'react';
import './ui.css';

export const Select = forwardRef(function Select(
  {
    label,
    error,
    hint,
    required = false,
    options = [],
    placeholder,
    id,
    className = '',
    containerClassName = '',
    children,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const errorId = `${selectId}-error`;
  const hintId = `${selectId}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={`field ${containerClassName}`.trim()}>
      {label ? (
        <label className="field__label" htmlFor={selectId}>
          {label}
          {required ? (
            <span className="field__required" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      ) : null}

      <select
        ref={ref}
        id={selectId}
        className={`field__control field__select ${className}`.trim()}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy || undefined}
        {...rest}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {children ||
          options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
      </select>

      {hint ? (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="field__error" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
});
