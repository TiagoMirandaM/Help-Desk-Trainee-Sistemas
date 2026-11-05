import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import './ui.css';

export const Button = forwardRef(function Button(
  {
    as: Component = 'button',
    variant = 'primary',
    size = 'md',
    block = false,
    loading = false,
    disabled = false,
    className = '',
    type = 'button',
    children,
    ...rest
  },
  ref,
) {
  const isButton = Component === 'button';

  return (
    <Component
      ref={ref}
      className={`btn btn--${variant} btn--${size} ${block ? 'btn--block' : ''} ${loading ? 'is-loading' : ''} ${className}`.trim()}
      type={isButton ? type : undefined}
      disabled={isButton ? disabled || loading : undefined}
      aria-disabled={disabled || loading || undefined}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Loader2 className="btn__spinner" size={16} aria-hidden="true" /> : null}
      <span className="btn__content">{children}</span>
    </Component>
  );
});
