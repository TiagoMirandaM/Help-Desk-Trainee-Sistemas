import { CalendarDays, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { PageHeader } from '../components/layout/PageHeader.jsx';
import { Avatar } from '../components/ui/Avatar.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { ROLES } from '../utils/constants.js';
import { formatDate } from '../utils/formatDate.js';
import { formatRole, getUserName } from '../utils/formatters.js';
import './pages.css';

export function ProfilePage() {
  const { user } = useAuth();

  const roleTone = user?.role === ROLES.TECHNICIAN ? 'violet' : 'info';

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Conta"
        title="Meu perfil"
        description="Dados de identificação e perfil de acesso disponibilizados pelo backend."
      />

      <section className="panel profile-card" aria-labelledby="profile-title">
        <div className="profile-card__header">
          <Avatar user={user} size="lg" />
          <div className="profile-card__identity">
            <h2 id="profile-title">{getUserName(user)}</h2>
            <p>{user?.email || user?.username}</p>
            <Badge tone={roleTone}>{formatRole(user?.role)}</Badge>
          </div>
        </div>

        <dl className="profile-grid">
          <div>
            <dt>
              <UserRound size={14} aria-hidden="true" /> Nome
            </dt>
            <dd>{getUserName(user)}</dd>
          </div>
          <div>
            <dt>
              <Mail size={14} aria-hidden="true" /> E-mail
            </dt>
            <dd>{user?.email || '—'}</dd>
          </div>
          <div>
            <dt>Usuário</dt>
            <dd>{user?.username || '—'}</dd>
          </div>
          <div>
            <dt>Perfil de acesso</dt>
            <dd>{formatRole(user?.role)}</dd>
          </div>
          <div>
            <dt>Setor</dt>
            <dd>{user?.department || '—'}</dd>
          </div>
          <div>
            <dt>
              <CalendarDays size={14} aria-hidden="true" /> Membro desde
            </dt>
            <dd>{user?.dateJoined ? formatDate(user.dateJoined) : '—'}</dd>
          </div>
        </dl>
      </section>

      <div className="profile-note" role="note">
        <LockKeyhole size={16} aria-hidden="true" />
        <div>
          <strong>Dados somente para consulta</strong>
          <p>
            As informações do perfil são gerenciadas pelo backend.
          </p>
        </div>
      </div>
    </div>
  );
}
