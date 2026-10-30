export interface RegisterDTO {
  nombre: string;
  telefono: string;
  email: string;
  password: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}