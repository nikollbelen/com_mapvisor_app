import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: string;
  is_active: boolean;
  must_change_password: boolean;
  project_id: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  mustChangePassword: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const userRef = useRef<User | null>(null);
  const isLoadingRef = useRef(true);
  const initAuthAbortControllerRef = useRef<AbortController | null>(null);
  const isInitializingRef = useRef(false);
  
  // Mantener refs actualizados
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  
  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  // Función para verificar el estado de autenticación usando /users/me con cookies HTTP-only
  const checkAuthStatus = useCallback(async (): Promise<{ isValid: boolean; user?: User }> => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      const normalizedBase = apiBaseUrl?.replace(/\/$/, '') || '';
      
      // Crear un AbortController para timeout de 5 segundos
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      try {
        // Usar /users/me con credentials: 'include' para verificar cookies HTTP-only
        const response = await fetch(`${normalizedBase}/users/me`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          },
          credentials: 'include',
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Si la respuesta es exitosa, las cookies son válidas y obtenemos los datos del usuario
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            return { isValid: true, user: data.data };
          }
        }
        
        // Si recibimos 401 o 403, las cookies son inválidas o la sesión expiró
        if (response.status === 401 || response.status === 403) {
          return { isValid: false };
        }
        
        // Para otros errores, considerar inválido
        return { isValid: false };
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        // Si es un abort (timeout), considerar como inválido por seguridad
        if (fetchError.name === 'AbortError') {
          return { isValid: false };
        }
        
        throw fetchError;
      }
    } catch (error) {
      // Si hay un error de red, no cambiar el estado (podría ser un problema de conexión)
      // No loguear errores normales de autenticación (401 es esperado si no hay sesión)
      return { isValid: false };
    }
  }, []);

  // Función auxiliar para iniciar sesión automáticamente con datos del usuario
  const autoLogin = useCallback((userData: User) => {
    console.log('✅ Iniciando sesión automáticamente con datos de /users/me:', userData);
    setUser(userData);
    setMustChangePassword(userData.must_change_password || false);
    localStorage.setItem('hasAuthSession', 'true');
  }, []);

  // Inicialización: verificar autenticación con cookies HTTP-only
  useEffect(() => {
    // Evitar múltiples inicializaciones simultáneas (React StrictMode)
    if (isInitializingRef.current) return;
    isInitializingRef.current = true;
    
    // Crear AbortController para cancelar la petición si el componente se desmonta
    initAuthAbortControllerRef.current = new AbortController();
    
    const initAuth = async () => {
      try {
        // Siempre verificar /users/me - si devuelve datos, iniciar sesión automáticamente
        const { isValid, user: userData } = await checkAuthStatus();
        
        if (initAuthAbortControllerRef.current?.signal.aborted) return;
        
        if (isValid && userData) {
          // Si /users/me devuelve datos válidos, iniciar sesión automáticamente
          autoLogin(userData);
        } else {
          // No hay sesión válida, limpiar el flag
          localStorage.removeItem('hasAuthSession');
          setUser(null);
          setMustChangePassword(false);
        }
      } catch (error) {
        if (initAuthAbortControllerRef.current?.signal.aborted) return;
        console.error('Error initializing auth:', error);
        localStorage.removeItem('hasAuthSession');
        setUser(null);
        setMustChangePassword(false);
      } finally {
        if (!initAuthAbortControllerRef.current?.signal.aborted) {
          setIsLoading(false);
        }
        isInitializingRef.current = false;
      }
    };

    initAuth();
    
    // Cleanup: abortar petición si el componente se desmonta
    return () => {
      if (initAuthAbortControllerRef.current) {
        initAuthAbortControllerRef.current.abort();
        initAuthAbortControllerRef.current = null;
      }
      isInitializingRef.current = false;
    };
  }, [checkAuthStatus, autoLogin]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      const normalizedBase = apiBaseUrl?.replace(/\/$/, '') || '';
      
      const response = await fetch(`${normalizedBase}/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        const { user: userData, must_change_password } = data.data;
        
        // Las cookies HTTP-only se establecen automáticamente por el servidor
        // Solo actualizamos el estado local con los datos del usuario
        setUser(userData);
        setMustChangePassword(must_change_password || false);
        
        // Guardar flag en localStorage para indicar que hubo un login exitoso
        localStorage.setItem('hasAuthSession', 'true');

        return true;
      } else {
        throw new Error(data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  // Función de logout
  const logout = useCallback(async () => {
    // Verificar si realmente hay una sesión antes de intentar logout
    const hadActiveUser = userRef.current !== null;

    // Limpiar estado local primero (siempre hacer esto)
    setUser(null);
    setMustChangePassword(false);
    
    // Remover flag de sesión
    localStorage.removeItem('hasAuthSession');

    // Solo intentar logout en backend si había un usuario activo actualmente
    // No hacer logout solo por el flag, porque puede que la sesión ya expiró
    if (hadActiveUser) {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      const normalizedBase = apiBaseUrl?.replace(/\/$/, '') || '';

      if (normalizedBase) {
        const logoutUrl = `${normalizedBase}/users/logout`;
        const logoutBody = {};
        
        // Console log para ver qué se envía al backend
        console.log('🔴 CERRANDO SESIÓN - Enviando al backend:', {
          url: logoutUrl,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          },
          body: logoutBody,
          credentials: 'include'
        });
        
        try {
          const response = await fetch(logoutUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'ngrok-skip-browser-warning': 'true'
            },
            credentials: 'include',
            body: JSON.stringify(logoutBody)
          });
          
          // Si recibimos 401, significa que la sesión ya expiró - ignorar silenciosamente
          if (response.status === 401 || response.status === 403) {
            // Sesión ya expirada, no hacer nada más
            return;
          }
        } catch (error) {
          // Silenciar errores de logout (puede ser que la sesión ya expiró o no hay conexión)
        }
      }
    }
  }, []);

  // Interceptar respuestas de fetch para detectar sesiones inválidas automáticamente
  useEffect(() => {
    // Guardar la función fetch original solo una vez
    if (!(window as any).__originalFetch) {
      (window as any).__originalFetch = window.fetch;
    }
    
    const originalFetch = (window as any).__originalFetch;
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

    // Sobrescribir fetch para interceptar respuestas
    window.fetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
      const response = await originalFetch(...args);
      
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
      const isUsersMe = url && url.includes('/users/me');
      
      // Si es /users/me y la respuesta es exitosa, iniciar sesión automáticamente
      if (isUsersMe && response.ok && url && apiBaseUrl && url.includes(apiBaseUrl)) {
        // Clonar la respuesta para leer el body sin consumirlo
        const clonedResponse = response.clone();
        
        try {
          const data = await clonedResponse.json();
          if (data.success && data.data) {
            const currentUser = userRef.current;
            // Solo iniciar sesión si no hay usuario o si el usuario es diferente
            if (!currentUser || currentUser.id !== data.data.id) {
              // Usar setTimeout para evitar problemas de sincronización
              setTimeout(() => {
                setUser(data.data);
                setMustChangePassword(data.data.must_change_password || false);
                localStorage.setItem('hasAuthSession', 'true');
                console.log('✅ /users/me devolvió datos - Sesión iniciada automáticamente');
              }, 0);
            }
          }
        } catch (error) {
          // Ignorar errores al parsear JSON
        }
      }
      
      // Si la respuesta es 401 o 403, verificar si es de nuestra API
      if (response.status === 401 || response.status === 403) {
        // Verificar si la petición es a nuestra API (no hacer logout por errores de otras APIs)
        if (url && apiBaseUrl && url.includes(apiBaseUrl)) {
          const currentUser = userRef.current;
          const isInitializing = isLoadingRef.current || isInitializingRef.current;
          
          // Si es /users/me y hay un usuario activo, significa que la sesión expiró - hacer logout
          // Solo ignorar /users/me durante la inicialización (cuando no hay usuario aún)
          if (isUsersMe && currentUser && !isInitializing) {
            console.log('⚠️ /users/me devolvió error - Sesión expirada, haciendo logout automático');
            // Clonar la respuesta antes de hacer logout
            const clonedResponse = response.clone();
            
            // Usar setTimeout para evitar problemas de sincronización
            setTimeout(() => {
              logout();
            }, 0);
            
            return clonedResponse;
          }
          
          // Para otras peticiones (no /users/me), hacer logout si hay usuario activo
          if (!isUsersMe && currentUser) {
            console.log('⚠️ Respuesta 401/403 detectada - Sesión expirada, haciendo logout automático');
            // Clonar la respuesta antes de hacer logout
            const clonedResponse = response.clone();
            
            // Usar setTimeout para evitar problemas de sincronización
            setTimeout(() => {
              logout();
            }, 0);
            
            return clonedResponse;
          }
        }
      }
      
      return response;
    };

    // Limpiar al desmontar
    return () => {
      // No restaurar fetch aquí para evitar conflictos si hay múltiples instancias
    };
  }, [logout]);

  // Verificación periódica de sesión con /users/me
  useEffect(() => {
    // Siempre verificar /users/me - si devuelve datos, iniciar sesión automáticamente
    const shouldCheckSession = () => {
      // Verificar siempre, incluso si no hay usuario activo
      // Esto permite iniciar sesión automáticamente si el backend tiene cookies válidas
      return true;
    };

    // Función para verificar sesión
    const verifySession = async () => {
      if (!shouldCheckSession()) return;

      try {
        const { isValid, user: userData } = await checkAuthStatus();
        
        if (isValid && userData) {
          // Sesión válida, iniciar sesión automáticamente si no hay usuario o si cambió
          if (!userRef.current || userRef.current.id !== userData.id) {
            autoLogin(userData);
          }
        } else {
          // Sesión inválida, hacer logout automático
          if (userRef.current !== null) {
            console.log('⚠️ Sesión expirada detectada en verificación periódica');
            logout();
          } else {
            // Limpiar flag si no hay usuario pero había flag
            localStorage.removeItem('hasAuthSession');
          }
        }
      } catch (error) {
        // Ignorar errores de red en verificaciones periódicas
        console.error('Error en verificación periódica de sesión:', error);
      }
    };

    // Verificar inmediatamente si hay sesión
    if (shouldCheckSession()) {
      verifySession();
    }

    // Verificar cada 30 segundos
    const intervalId = setInterval(() => {
      if (shouldCheckSession()) {
        verifySession();
      }
    }, 30000); // 30 segundos

    // Verificar cuando la ventana vuelve a tener foco
    const handleFocus = () => {
      if (shouldCheckSession()) {
        verifySession();
      }
    };

    window.addEventListener('focus', handleFocus);

    // Cleanup
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkAuthStatus, logout, autoLogin]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    mustChangePassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
