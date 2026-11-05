import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  Columns3,
  Eye,
  EyeOff,
  LifeBuoy,
  LockKeyhole,
  LogIn,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useToast } from '../contexts/ToastContext.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import logoUrl from '../assets/logo.svg';
import { DEMO_MODE } from '../utils/env.js';
import { DEMO_ACCOUNTS } from '../services/demo/demoSeed.js';
import { ROLES } from '../utils/constants.js';
import { getActionErrorMessage } from '../utils/errorMessages.js';
import './pages.css';

const FEATURES = [
  {
    icon: Columns3,
    title: 'Kanban operacional',
    description: 'Visão clara das etapas do atendimento.',
  },
  {
    icon: ShieldCheck,
    title: 'Permissões por perfil',
    description: 'Cada usuário vê apenas o que pode acessar.',
  },
  {
    icon: Activity,
    title: 'Histórico auditável',
    description: 'Rastreabilidade de cada transição de status.',
  },
];

export function LoginPage() {
  const { login, sessionExpired } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { username: '', password: '' },
  });

  async function submit(values) {
    setServerError('');

    try {
      const user = await login({
        username: values.username.trim(),
        password: values.password,
      });

      toast.success('Acesso autorizado', `Bem-vindo, ${user.name || user.username}.`);
      navigate('/chamados', {
        replace: true,
      });
    } catch (error) {
      if (error?.status === 401) {
        setServerError('Usuário ou senha inválidos. Verifique os dados e tente novamente.');
      } else {
        setServerError(
          getActionErrorMessage(error, 'Não foi possível entrar. Tente novamente.'),
        );
      }
    }
  }

  function fillDemoAccount(account) {
    setValue('username', account.username, { shouldValidate: true });
    setValue('password', account.password, { shouldValidate: true });
    setServerError('');
  }

  return (
    <div className="login-page">
      <section className="login-hero" aria-labelledby="login-hero-title">


        <div className="login-hero__content">
          <span className="login-hero__eyebrow">Help Desk</span>
          <h1 className="login-hero__title" id="login-hero-title">
            Atendimento organizado, do chamado à resolução.
          </h1>
          <p>Centralize solitações, priorize urgências e acompanhe cada etapa do atendimento em um único lugar</p>
          


          <div className="login-hero__logo-wrapper">
            <img className="login-hero__logo" src={logoUrl} alt="Commit Jr" />
          </div>
        </div>

        <p className="login-hero__footer">
          MVP Helpdesk · Commit Jr
        </p>
      </section>

      <main className="login-main">
        <div className="login-card">
          <header className="login-card__header">
            <span className="login-card__icon" aria-hidden="true">
              <LockKeyhole size={20} />
            </span>
            <h2>Entrar na plataforma</h2>
            <p>Use suas credenciais para acessar o painel de atendimento.</p>
          </header>

          {sessionExpired ? (
            <div className="login-notice" role="status">
              <AlertCircle size={16} aria-hidden="true" />
              Sua sessão expirou. Entre novamente para continuar.
            </div>
          ) : null}

          {serverError ? (
            <div className="form-alert form-alert--error" role="alert">
              <AlertCircle size={18} aria-hidden="true" />
              <span>{serverError}</span>
            </div>
          ) : null}

          <form className="login-form" onSubmit={handleSubmit(submit)} noValidate>
            <Input
              id="login-username"
              label="E-mail ou usuário"
              type="text"
              autoComplete="username"
              placeholder="seu.nome@empresa.com"
              required
              error={errors.username?.message}
              {...register('username', {
                required: 'Informe seu e-mail ou usuário.',
              })}
            />

            <div className="login-password">
              <Input
                id="login-password"
                label="Senha"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Digite sua senha"
                required
                error={errors.password?.message}
                {...register('password', {
                  required: 'Informe sua senha.',
                })}
              />
              <button
                type="button"
                className="login-password__toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <EyeOff size={17} aria-hidden="true" />
                ) : (
                  <Eye size={17} aria-hidden="true" />
                )}
              </button>
            </div>

            <Button type="submit" size="lg" block loading={isSubmitting}>
              <LogIn size={17} aria-hidden="true" />
              {isSubmitting ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>

          {DEMO_MODE ? (
            <section className="demo-login" aria-labelledby="demo-login-title">
              <div className="demo-login__header">
                <h3 id="demo-login-title">Acesso de demonstração</h3>
                <span>Dados fictícios</span>
              </div>
              <p className="demo-login__description">
                Escolha um perfil para preencher as credenciais. A demonstração
                usa um backend simulado no navegador.
              </p>
              <div className="demo-login__accounts">
                {DEMO_ACCOUNTS.map((account) => (
                  <button
                    key={account.username}
                    type="button"
                    className="demo-account"
                    onClick={() => fillDemoAccount(account)}
                  >
                    <span className="demo-account__role">{account.label}</span>
                    <span className="demo-account__name">{account.name}</span>
                    <span className="demo-account__credentials">
                      {account.username} · {account.password}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <p className="login-card__note">
            O cadastro de usuários é realizado pelo administrador do sistema.
          </p>
        </div>
      </main>
    </div>
  );
}
