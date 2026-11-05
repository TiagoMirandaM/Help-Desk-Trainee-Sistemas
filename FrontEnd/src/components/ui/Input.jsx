import { forwardRef, useId } from 'react';
import './ui.css';

export const Input = forwardRef(function Input(
  {
    label,
    error,
    hint,
    required = false,
    id,
    className = '',
    containerClassName = '',
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={`field ${containerClassName}`.trim()}>
      {label ? (
        <label className="field__label" htmlFor={inputId}>
          {label}
          {required ? (
            <span className="field__required" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      ) : null}

      <input
        ref={ref}
        id={inputId}
        className={`field__control ${className}`.trim()}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy || undefined}
        {...rest}
      />

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
