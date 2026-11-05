const STATUS_MESSAGES = {
  400: 'Os dados enviados não são válidos. Revise as informações e tente novamente.',
  401: 'Sua sessão expirou. Entre novamente para continuar.',
  403: 'Você não possui permissão para realizar esta ação.',
  404: 'O recurso solicitado não foi encontrado.',
  409: 'Este registro foi alterado por outro usuário. Atualize os dados e tente novamente.',
  500: 'Ocorreu um erro no servidor. Tente novamente em instantes.',
};

export function getActionErrorMessage(error, fallback = 'Não foi possível concluir a ação.') {
  if (!error) return fallback;
  if (error.isNetworkError) {
    return 'Falha de conexão com o servidor. Verifique sua rede e tente novamente.';
  }
  if (error.message && ![400, 401, 403, 404, 409, 500].includes(error.status)) {
    return error.message;
  }
  return STATUS_MESSAGES[error.status] || error.message || fallback;
}

export function getLoadErrorMessage(error, resource = 'os dados') {
  if (!error) return `Não foi possível carregar ${resource}. Tente novamente.`;
  if (error.isNetworkError) {
    return `Não foi possível conectar ao servidor para carregar ${resource}. Verifique sua conexão.`;
  }
  if (error.status === 403) {
    return 'Você não possui permissão para acessar este conteúdo.';
  }
  if (error.status === 404) {
    return 'O recurso solicitado não foi encontrado.';
  }
  if (error.status === 401) {
    return 'Sua sessão expirou. Entre novamente para continuar.';
  }
  return `Não foi possível carregar ${resource}. Tente novamente.`;
}
