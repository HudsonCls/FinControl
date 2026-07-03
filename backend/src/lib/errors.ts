/** Erro de aplicação com status HTTP e código estável para o cliente. */
export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }

  static badRequest(message = 'Requisição inválida', details?: unknown): AppError {
    return new AppError(400, 'BAD_REQUEST', message, details);
  }
  static unauthorized(message = 'Não autenticado'): AppError {
    return new AppError(401, 'UNAUTHORIZED', message);
  }
  static forbidden(message = 'Sem permissão'): AppError {
    return new AppError(403, 'FORBIDDEN', message);
  }
  static notFound(message = 'Não encontrado'): AppError {
    return new AppError(404, 'NOT_FOUND', message);
  }
  static conflict(message = 'Conflito', details?: unknown): AppError {
    return new AppError(409, 'CONFLICT', message, details);
  }
}
