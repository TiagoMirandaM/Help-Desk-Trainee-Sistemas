export class ApiError extends Error {
  constructor(message, { status = 0, code = null, details = null, isNetworkError = false } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.isNetworkError = isNetworkError;
  }
}

const DEFAULT_MESSAGES = {
  400: 'Os dados enviados não são válidos.',
  401: 'Sessão expirada ou credenciais inválidas.',
  403: 'Você não possui permissão para acessar este recurso.',
  404: 'Recurso não encontrado.',
  409: 'O registro foi alterado por outro usuário.',
  500: 'Erro interno do servidor.',
};

function extractMessage(data) {
  if (!data) return null;
  if (typeof data === 'string') return data;
  if (typeof data.detail === 'string') return data.detail;
  if (typeof data.message === 'string') return data.message;

  if (typeof data === 'object') {
    const entry = Object.entries(data).find(([, value]) => {
      return typeof value === 'string' || Array.isArray(value);
    });

    if (entry) {
      const [field, value] = entry;
      const text = Array.isArray(value) ? value[0] : value;
      if (typeof text === 'string') {
        return field === 'non_field_errors' || field === 'detail'
          ? text
          : `${field}: ${text}`;
      }
    }
  }

  return null;
}

export function normalizeAxiosError(error) {
  if (error instanceof ApiError) return error;

  if (!error?.response) {
    return new ApiError(
      'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
      {
        code: error?.code || null,
        isNetworkError: true,
      },
    );
  }

  const { status, data } = error.response;
  const message =
    extractMessage(data) || DEFAULT_MESSAGES[status] || 'Não foi possível concluir a requisição.';

  return new ApiError(message, {
    status,
    code: data?.code || null,
    details: data,
  });
}
