/** Paleta única de estados — misma que la leyenda del BottomBar */
export const LOT_STATUS_COLORS = {
  disponible: {
    hex: "#22c55e",
    glowHex: "#4ade80",
    glowRgba: "rgba(34, 197, 94, 0.6)",
  },
  reservado: {
    hex: "#f97316",
    glowHex: "#fb923c",
    glowRgba: "rgba(249, 115, 22, 0.6)",
  },
  vendido: {
    hex: "#dc2626",
    glowHex: "#f87171",
    glowRgba: "rgba(220, 38, 38, 0.6)",
  },
  negociacion: {
    hex: "#3b82f6",
    glowHex: "#60a5fa",
    glowRgba: "rgba(59, 130, 246, 0.6)",
  },
} as const;

export type LotStatusKey = keyof typeof LOT_STATUS_COLORS;

export function normalizeLotStatus(
  status: string | undefined | null
): LotStatusKey {
  const normalized = (status || "").toString().toLowerCase();
  if (normalized in LOT_STATUS_COLORS) {
    return normalized as LotStatusKey;
  }
  return "disponible";
}

export function getLotStatusBadgeStyle(status: string | undefined | null) {
  const key = normalizeLotStatus(status);
  const { hex } = LOT_STATUS_COLORS[key];
  return {
    color: hex,
    backgroundColor: `${hex}26`,
    borderColor: hex,
  };
}

export const LOT_STATUS_LEGEND_ITEMS: {
  key: LotStatusKey;
  label: string;
}[] = [
  { key: "disponible", label: "Disponible" },
  { key: "reservado", label: "Reservado" },
  { key: "vendido", label: "Vendido" },
  { key: "negociacion", label: "En negociación" },
];
