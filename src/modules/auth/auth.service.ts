import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { IAuthRepository } from './auth.repository';
import { RegisterDTO, LoginDTO } from './auth.dto';
import { AppError } from '../../shared/errors/AppError';
import { env } from '../../config/env';

export class AuthService {
  constructor(private readonly authRepo: IAuthRepository) {}

  async register(dto: RegisterDTO) {
    const { nombre, telefono, email, password } = dto;

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new AppError(400, 'CAMPO_REQUERIDO', 'El campo email es obligatorio y debe tener un formato válido.', [
        { campo: 'email', valor_recibido: email ?? null },
      ]);
    }

    if (password === undefined || password === null || typeof password !== 'string' || password.trim() === '') {
      throw new AppError(400, 'CAMPO_REQUERIDO', 'El campo password es obligatorio.', [
        { campo: 'password', valor_recibido: null },
      ]);
    }

    if (!nombre || typeof nombre !== 'string' || !telefono || typeof telefono !== 'string') {
      throw new AppError(400, 'CAMPO_REQUERIDO', 'Los campos nombre y telefono son obligatorios.');
    }

    if (password.length < 8) {
      throw new AppError(422, 'PASSWORD_DEBIL', 'La contraseña debe tener al menos 8 caracteres.', [
        { campo: 'password', longitud: password.length, minimo: 8 },
      ]);
    }

    const existente = await this.authRepo.findByEmail(email);
    if (existente) {
      throw new AppError(409, 'EMAIL_DUPLICADO', 'Ya existe una cuenta con ese email.', []);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const nuevoUsuario = await this.authRepo.createCliente({
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
    });

    return {
      id: nuevoUsuario.id,
      nombre: nuevoUsuario.nombre,
      telefono: nuevoUsuario.telefono,
      email: nuevoUsuario.email,
      rol: nuevoUsuario.rol,
    };
  }

  async login(dto: LoginDTO) {
    const { email, password } = dto;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      throw new AppError(400, 'CAMPO_REQUERIDO', 'Email y contraseña son obligatorios.');
    }

    const usuario = await this.authRepo.findByEmail(email.toLowerCase().trim());
    if (!usuario) {
      throw new AppError(401, 'CREDENCIALES_INVALIDAS', 'Email o contraseña incorrectos.', []);
    }

    const passwordValido = await bcrypt.compare(password, usuario.password);
    if (!passwordValido) {
      throw new AppError(401, 'CREDENCIALES_INVALIDAS', 'Email o contraseña incorrectos.', []);
    }

    const payload = {
      sub: String(usuario.id),
      rol: usuario.rol,
    };

    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    });

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: env.JWT_EXPIRES_IN,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
      },
    };
  }
}