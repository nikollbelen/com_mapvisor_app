export type UserRole = "admin" | "vendedor";

export interface AppUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
}

export type TopbarButtonId = "fotos" | "areas" | "lotes" | "entorno" | "video";

export type TopbarVisibility = Record<TopbarButtonId, boolean>;
