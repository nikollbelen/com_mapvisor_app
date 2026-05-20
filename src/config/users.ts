/**
 * Usuarios de demostración (solo desarrollo / prototipo).
 * En producción las credenciales deben validarse en el servidor, no en el frontend.
 */
import type { AppUser } from "../types/auth";

export type DemoUserRecord = AppUser & { password: string };

export const DEMO_USERS: DemoUserRecord[] = [
  {
    id: "admin-1",
    email: "admin@lomas.com",
    password: "admin123",
    full_name: "Administrador",
    role: "admin",
  },
  {
    id: "vendedor-1",
    email: "vendedor@lomas.com",
    password: "vendedor123",
    full_name: "Vendedor Demo",
    role: "vendedor",
  },
];
