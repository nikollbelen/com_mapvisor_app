import { useState } from "react";
import "./LoginModal.css";
import { useAuth } from "../../../contexts/AuthContext";

interface LoginModalProps {
  isVisible: boolean;
  onClose: () => void;
}

interface LoginCredentials {
  email: string;
  password: string;
}

const LoginModal = ({ isVisible, onClose }: LoginModalProps) => {
  const { login } = useAuth();
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: ''
  });

  const [errors, setErrors] = useState({
    email: '',
    password: '',
    login: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Validar email
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validar campo específico
  const validateField = (field: string, value: string) => {
    const newErrors = { ...errors };
    
    if (field === 'email') {
      newErrors.email = value && !validateEmail(value)
        ? 'Ingrese un correo electrónico válido'
        : '';
    } else if (field === 'password') {
      newErrors.password = value && value.length < 6
        ? 'La contraseña debe tener al menos 6 caracteres'
        : '';
    }
    
    setErrors(newErrors);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Limpiar errores anteriores
    setErrors({ email: '', password: '', login: '' });
    
    // Validar campos
    const hasErrors = !!(errors.email || errors.password);
    
    if (hasErrors || !credentials.email || !credentials.password) {
      alert('Por favor complete todos los campos correctamente');
      return;
    }

    setIsLoading(true);
    
    try {
      const success = await login(credentials.email, credentials.password);
      
      if (success) {
        // Login exitoso
        onClose();
        
        // Limpiar formulario
        setCredentials({ email: '', password: '' });
      } else {
        // Credenciales incorrectas
        setErrors(prev => ({ 
          ...prev, 
          login: 'Correo electrónico o contraseña incorrectos' 
        }));
      }
    } catch (error) {
      console.error('Error en login:', error);
      setErrors(prev => ({ 
        ...prev, 
        login: 'Error al iniciar sesión. Por favor, intente nuevamente.' 
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof LoginCredentials, value: string) => {
    setCredentials(prev => ({ ...prev, [field]: value }));
    validateField(field, value);
  };

  if (!isVisible) return null;

  return (
    <div className="login-modal-overlay">
      <div className="login-modal">
        <button className="login-modal-close" onClick={onClose}>
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="login-hero">
          <div className="login-logo-container">
            <span className="material-symbols-outlined login-logo-icon">domain</span>
          </div>
          {!showForgot ? (
            <>
              <h1 className="login-title">Bienvenido a Lomas de Jesús</h1>
              <p className="login-subtitle">El visor inmersivo que conecta tus proyectos con la realidad</p>
            </>
          ) : (
            <>
              <h1 className="login-title">Recuperar Acceso</h1>
              <p className="login-subtitle forgot-desc">Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña</p>
            </>
          )}
        </div>

        <div className="login-modal-content">
          {!showForgot ? (
            <form className="login-form" onSubmit={handleSubmit}>
              <div className="input-group">
                <label className="form-label" htmlFor="email">Usuario / Email</label>
                <input
                  id="email"
                  type="email"
                  className={`form-input ${errors.email ? 'error' : ''}`}
                  placeholder="ejemplo@correo.com"
                  value={credentials.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  disabled={isLoading}
                />
                {errors.email && <div className="error-message">{errors.email}</div>}

                <label className="form-label" htmlFor="password">Contraseña</label>
                <div className="password-input-wrapper">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className={`form-input ${errors.password ? 'error' : ''}`}
                    placeholder="••••••••"
                    value={credentials.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    <span className="material-symbols-outlined">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                {errors.password && <div className="error-message">{errors.password}</div>}
              </div>

              <div className="login-row">
                <label className="remember">
                  <input
                    type="checkbox"
                    className="remember-checkbox"
                    defaultChecked
                  />
                  Recordarme
                </label>
                <button type="button" className="forgot" onClick={() => setShowForgot(true)}>
                  Olvidé mi contraseña
                </button>
              </div>

              {errors.login && (
                <div className="login-error">
                  <span className="material-symbols-outlined">warning</span>
                  {errors.login}
                </div>
              )}

              <div className="login-actions">
                <button 
                  type="submit"
                  className="btn-submit" 
                  disabled={isLoading}
                >
                  {isLoading ? 'INGRESANDO...' : 'INGRESAR'}
                </button>
              </div>
            </form>
          ) : (
            <form className="login-form" onSubmit={(e) => { e.preventDefault(); alert('Se envió un link al correo ingresado'); }}>
              <div className="input-group">
                <label className="form-label" htmlFor="recover-email">Correo Electrónico</label>
                <input
                  id="recover-email"
                  type="email"
                  className="form-input"
                  placeholder="tu@correo.com"
                  value={credentials.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="login-actions">
                <button type="submit" className="btn-submit" disabled={isLoading}>
                  ENVIAR ENLACE
                </button>
              </div>

              <div className="login-row" style={{ marginTop: 16, justifyContent: 'center' }}>
                <button type="button" className="forgot" onClick={() => setShowForgot(false)}>
                  Volver al inicio de sesión
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
