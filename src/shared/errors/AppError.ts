export class AppError extends Error {
  public readonly statusCode: number;
  public readonly codigo: string;
  public readonly detalles: Record<string, unknown>[];

  constructor(
    statusCode: number,
    codigo: string,
    mensaje: string,
    detalles: Record<string, unknown>[] = []
  ) {
    super(mensaje);
    this.statusCode = statusCode;
    this.codigo = codigo;
    this.detalles = detalles;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}