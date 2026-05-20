import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_TOPBAR_VISIBILITY } from "../config/topbarButtons";
import type { TopbarButtonId, TopbarVisibility } from "../types/auth";

const STORAGE_KEY = "mapvisor_topbar_visibility";

interface UiVisibilityContextType {
  visibility: TopbarVisibility;
  isButtonVisible: (id: TopbarButtonId) => boolean;
  setButtonVisible: (id: TopbarButtonId, visible: boolean) => void;
  resetVisibility: () => void;
}

const UiVisibilityContext = createContext<UiVisibilityContextType | undefined>(
  undefined
);

const loadVisibility = (): TopbarVisibility => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_TOPBAR_VISIBILITY };
    const parsed = JSON.parse(raw) as Partial<TopbarVisibility>;
    return { ...DEFAULT_TOPBAR_VISIBILITY, ...parsed };
  } catch {
    return { ...DEFAULT_TOPBAR_VISIBILITY };
  }
};

export const UiVisibilityProvider = ({ children }: { children: ReactNode }) => {
  const [visibility, setVisibility] = useState<TopbarVisibility>(loadVisibility);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visibility));
  }, [visibility]);

  const isButtonVisible = useCallback(
    (id: TopbarButtonId) => visibility[id],
    [visibility]
  );

  const setButtonVisible = useCallback((id: TopbarButtonId, visible: boolean) => {
    setVisibility((prev) => ({ ...prev, [id]: visible }));
  }, []);

  const resetVisibility = useCallback(() => {
    setVisibility({ ...DEFAULT_TOPBAR_VISIBILITY });
  }, []);

  const value = useMemo(
    () => ({
      visibility,
      isButtonVisible,
      setButtonVisible,
      resetVisibility,
    }),
    [visibility, isButtonVisible, setButtonVisible, resetVisibility]
  );

  return (
    <UiVisibilityContext.Provider value={value}>
      {children}
    </UiVisibilityContext.Provider>
  );
};

export const useUiVisibility = (): UiVisibilityContextType => {
  const context = useContext(UiVisibilityContext);
  if (!context) {
    throw new Error("useUiVisibility debe usarse dentro de UiVisibilityProvider");
  }
  return context;
};
