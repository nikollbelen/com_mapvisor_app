import type { TopbarButtonId } from "../types/auth";

export const TOPBAR_BUTTONS: {
  id: TopbarButtonId;
  label: string;
  icon: string;
}[] = [
  { id: "fotos", label: "Fotos 360", icon: "360" },
  { id: "areas", label: "Áreas Comunes", icon: "park" },
  { id: "lotes", label: "Lotes", icon: "grid_view" },
  { id: "entorno", label: "Entorno", icon: "landscape" },
  { id: "video", label: "Video", icon: "videocam" },
];

export const DEFAULT_TOPBAR_VISIBILITY: Record<TopbarButtonId, boolean> = {
  fotos: true,
  areas: true,
  lotes: true,
  entorno: true,
  video: true,
};
