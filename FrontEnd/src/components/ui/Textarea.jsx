import { forwardRef, useId } from 'react';
import './ui.css';

export const Textarea = forwardRef(function Textarea(
  {
    label,
    error,
    hint,
    required = false,
    id,
    className = '',
    containerClassName = '',
    value,
    maxLength,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const textareaId = id || generatedId;
  const errorId = `${textareaId}-error`;
  const hintId = `${textareaId}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null]
    .filter(Boolean)
    .join(' ');
  const length = typeof value === 'string' ? value.length : 0;

  return (
    <div className={`field ${containerClassName}`.trim()}>
      {label ? (
        <label className="field__label" htmlFor={textareaId}>
          {label}
          {required ? (
            <span className="field__required" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      ) : null}

      <textarea
        ref={ref}
        id={textareaId}
        className={`field__control field__textarea ${className}`.trim()}
        required={required}
        value={value}
        maxLength={maxLength}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy || undefined}
        {...rest}
      />

      <div className="field__meta">
        {hint ? (
          <p className="field__hint" id={hintId}>
            {hint}
          </p>
        ) : (
          <span />
        )}
        {maxLength ? (
          <span className="field__counter" aria-live="polite">
            {length}/{maxLength}
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="field__error" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
});
