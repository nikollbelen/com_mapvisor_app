import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import "./ContactModal.css";

interface ContactModalProps {
  isVisible: boolean;
  type: "print" | "save" | "email";
  onClose: () => void;
  onSubmit: (data: ContactData) => void;
  currentUser?: { id: string; full_name?: string; email: string } | null;
  quotationCode?: string;
}

interface ContactData {
  vendedorId?: string;
  vendedor?: { id?: string; full_name?: string; email: string };
  cliente: {
    nombre: string;
    apellido?: string;
    tipoDocumento?: string;
    dni?: string;
    email: string;
    codigoPais?: string;
    telefono?: string;
  };
  fileName?: string;
  validity?: { days: number; from: string; to: string };
}

interface SellerData {
  id: string;
  nombre: string;
  email: string;
}

// ─── Constantes ────────────────────────────────────────────────────────────────

const DOCUMENT_RULES = [
  { value: "DNI",       label: "DNI",                 digits: 8  },
  { value: "RUC",       label: "RUC",                 digits: 11 },
  { value: "CE",        label: "Carné de Extranjería", digits: 12 },
  { value: "Pasaporte", label: "Pasaporte",            digits: 12 },
] as const;

const COUNTRY_CODES = [
  { code: "+51", country: "Perú",     flag: "🇵🇪", digits: 9,  format: "XXX XXX XXX"      },
  { code: "+52", country: "México",   flag: "🇲🇽", digits: 10, format: "(XXX) XXX XXXX"    },
  { code: "+54", country: "Argentina",flag: "🇦🇷", digits: 10, format: "XXX XXXX XXXX"     },
  { code: "+55", country: "Brasil",   flag: "🇧🇷", digits: 11, format: "(XX) XXXXX-XXXX"   },
  { code: "+56", country: "Chile",    flag: "🇨🇱", digits: 9,  format: "X XXXX XXXX"       },
  { code: "+57", country: "Colombia", flag: "🇨🇴", digits: 10, format: "(XXX) XXX XXXX"    },
  { code: "+34", country: "España",   flag: "🇪🇸", digits: 9,  format: "XXX XXX XXX"       },
  { code: "+1",  country: "USA/Can",  flag: "🇺🇸", digits: 10, format: "(XXX) XXX-XXXX"    },
];

// ─── Helpers ────────────────────────────────────────────────────────────────────

const toDdMmYyyy = (d: Date) =>
  `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

const buildDefaultValidity = (days = 7) => {
  const today = new Date();
  const to = new Date(today);
  to.setDate(today.getDate() + (days - 1));
  return { days, from: toDdMmYyyy(today), to: toDdMmYyyy(to) };
};

const buildDefaultState = (currentUser?: ContactModalProps["currentUser"]): ContactData => ({
  vendedorId: currentUser?.id ?? "",
  vendedor: currentUser
    ? { id: currentUser.id, full_name: currentUser.full_name, email: currentUser.email }
    : { id: "", email: "" },
  cliente: { nombre: "", email: "", tipoDocumento: "DNI", codigoPais: "+51", telefono: "" },
  fileName: "",
  validity: buildDefaultValidity(),
});

const getDocumentRule = (value?: string) =>
  DOCUMENT_RULES.find((r) => r.value === value) ?? DOCUMENT_RULES[0];

const getCountry = (code?: string) =>
  COUNTRY_CODES.find((c) => c.code === code) ?? COUNTRY_CODES[0];

const onlyLetters = (v: string) => v.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s-]/g, "");
const onlyDigits  = (v: string) => v.replace(/\D/g, "");

const formatPhone = (raw: string, countryCode = "+51"): string => {
  const country = getCountry(countryCode);
  const numbers = onlyDigits(raw).slice(0, country.digits);
  const fmt = country.format;

  if (fmt === "(XXX) XXX XXXX" || fmt === "(XXX) XXX-XXXX")
    return numbers.replace(/(\d{1,3})(\d{3})(\d{4})(\d*)/, (_, g1, g2, g3) =>
      `${g1} ${g2} ${g3}`.trim()
    );
  if (fmt === "XXX XXXX XXXX")
    return numbers.replace(/(\d{3})(\d{4})(\d{4})(\d*)/, (_, g1, g2, g3) =>
      `${g1} ${g2} ${g3}`.trim()
    );
  if (fmt === "(XX) XXXXX-XXXX")
    return numbers.replace(/(\d{2})(\d{5})(\d{4})(\d*)/, (_, g1, g2, g3) =>
      `${g1} ${g2}-${g3}`.trim()
    );
  if (fmt === "X XXXX XXXX")
    return numbers.replace(/(\d{1})(\d{4})(\d{4})(\d*)/, (_, g1, g2, g3) =>
      `${g1} ${g2} ${g3}`.trim()
    );
  // Default: XXX XXX XXX (Perú, España)
  return numbers.replace(/(\d{1,3})(\d{3})(\d{3})(\d*)/, (_, g1, g2, g3, g4) => {
    if (g4) return `${g1} ${g2} ${g3} ${g4}`;
    if (g3 && g3.length === 3) return `${g1} ${g2} ${g3}`;
    if (g2 && g2.length === 3) return `${g1} ${g2}`;
    return g1;
  });
};

const validateEmail  = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const validateName   = (v: string) => /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s-]+$/.test(v);
const validatePhone_ = (v: string, code = "+51") => {
  const country = getCountry(code);
  return onlyDigits(v).length === country.digits;
};
const validateDoc = (v: string, tipo?: string) => {
  const { digits } = getDocumentRule(tipo);
  return new RegExp(`^\\d{${digits}}$`).test(v);
};

// ─── Component ──────────────────────────────────────────────────────────────────

const ContactModal = ({
  isVisible,
  type,
  onClose,
  onSubmit,
  currentUser,
  quotationCode,
}: ContactModalProps) => {
  const [sellers] = useState<SellerData[]>([]);
  const [data, setData] = useState<ContactData>(() => buildDefaultState(currentUser));

  const [errors, setErrors] = useState({
    cliente: { nombre: "", apellido: "", dni: "", email: "", telefono: "" },
  });

  // ── Sincronizar vendedor cuando cambia currentUser ──
  useEffect(() => {
    setData((prev) => ({
      ...prev,
      vendedorId: currentUser?.id ?? "",
      vendedor: currentUser
        ? { id: currentUser.id, full_name: currentUser.full_name, email: currentUser.email }
        : { id: "", email: "" },
    }));
  }, [currentUser]);

  // ── fileName: establecer código de cotización al abrir ──
  useEffect(() => {
    if (isVisible && quotationCode && type === "save") {
      setData((prev) => {
        const cur = prev.fileName ?? "";
        const isCode = /^COT-\d{4}-\d{3}$/.test(cur) || cur === quotationCode;
        return isCode && cur !== "" ? prev : { ...prev, fileName: quotationCode };
      });
    } else if (!isVisible) {
      setData((prev) => ({ ...prev, fileName: "" }));
    }
  }, [isVisible, quotationCode, type]);

  // ── Auto-generar fileName cuando cambian nombre/apellido ──
  useEffect(() => {
    if (type !== "save") return;
    const cur = data.fileName ?? "";
    const isCode = /^COT-\d{4}-\d{3}$/.test(cur) || cur === quotationCode;
    if (isCode) return;

    const nombre   = data.cliente.nombre   ?? "";
    const apellido = data.cliente.apellido ?? "";
    if (!nombre && !apellido) return;

    const fecha = new Date().toISOString().split("T")[0];
    const auto  = `${nombre}_${apellido}_${fecha}`.replace(/\s+/g, "_") || `Documento_${fecha}`;
    if (!cur || cur === "" || cur.startsWith("Documento_")) {
      setData((prev) => ({ ...prev, fileName: auto }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.cliente.nombre, data.cliente.apellido, type, quotationCode]);

  // ── Sincronizar vendedor desde lista ──
  useEffect(() => {
    if (!data.vendedorId) return;
    const found = sellers.find((s) => s.id === data.vendedorId);
    if (found) {
      setData((prev) => ({
        ...prev,
        vendedor: { id: found.id, full_name: found.nombre, email: found.email },
      }));
    }
  }, [data.vendedorId, sellers]);

  // ── Helpers ──

  const setCliente = (patch: Partial<ContactData["cliente"]>) =>
    setData((prev) => ({ ...prev, cliente: { ...prev.cliente, ...patch } }));

  const setClienteErr = (field: keyof typeof errors.cliente, msg: string) =>
    setErrors((prev) => ({ ...prev, cliente: { ...prev.cliente, [field]: msg } }));

  const recalcValidity = (days: number) => {
    if (!days || days <= 0) {
      setData((prev) => ({ ...prev, validity: { days: 0, from: "", to: "" } }));
      return;
    }
    setData((prev) => ({ ...prev, validity: buildDefaultValidity(days) }));
  };

  // ── Validación en handleSubmit ──
  const handleSubmit = () => {
    const { nombre, apellido, dni, email, telefono, tipoDocumento, codigoPais } = data.cliente;

    const newErrors = {
      nombre:   nombre   && !validateName(nombre)                   ? "Solo letras y espacios"     : "",
      apellido: apellido && !validateName(apellido)                  ? "Solo letras y espacios"     : "",
      dni:      dni      && !validateDoc(dni, tipoDocumento)         ? `${getDocumentRule(tipoDocumento).digits} dígitos` : "",
      email:    email    && !validateEmail(email)                    ? "Email inválido"              : "",
      telefono: telefono && !validatePhone_(telefono, codigoPais)    ? `${getCountry(codigoPais).digits} dígitos` : "",
    };
    setErrors({ cliente: newErrors });

    const hasFormatError = Object.values(newErrors).some(Boolean);
    if (hasFormatError) {
      alert("Por favor corrija los errores antes de continuar");
      return;
    }

    if (!nombre || !apellido || !dni || !email) {
      alert("Por favor complete todos los campos requeridos");
      return;
    }

    onSubmit(data);
    onClose();
  };

  // ── Labels / icons por tipo ──
  const META = {
    print: { title: "Imprimir cotización",   submit: "Imprimir",   icon: "fa-print"     },
    save:  { title: "Guardar cotización PDF", submit: "Guardar PDF", icon: "fa-download"  },
    email: { title: "Enviar por correo",      submit: "Enviar",      icon: "fa-envelope"  },
  };
  const meta = META[type];

  // ── Iniciales del vendedor ──
  const sellerInitials = currentUser?.full_name
    ? currentUser.full_name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
    : currentUser?.email?.[0]?.toUpperCase() ?? "V";

  if (!isVisible) return null;

  return createPortal(
    <div className="contact-modal-overlay">
      <div className="contact-modal" role="dialog" aria-modal="true" aria-labelledby="cm-title">
        {/* ── Header ── */}
        <div className="contact-modal-header">
          <h2 className="contact-modal-title" id="cm-title">{meta.title}</h2>
          <button className="contact-modal-close" onClick={onClose} aria-label="Cerrar">
            <i className="fas fa-times" />
          </button>
        </div>
        <div className="contact-modal-divider" />

        {/* ── Content ── */}
        <div className="contact-modal-content">
          <div className="contact-form">

            {/* Vendedor (solo si hay sesión) */}
            {currentUser && (
              <div>
                <p className="form-section-title">
                  <i className="fas fa-user-tie" style={{ fontSize: "0.7rem", color: "#e9c176" }} />
                  Vendedor
                </p>
                <div className="contact-seller-badge">
                  <div className="seller-icon">{sellerInitials}</div>
                  <div className="seller-info">
                    <strong>{currentUser.full_name || "Vendedor"}</strong>
                    <span>{currentUser.email}</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── Datos del cliente ── */}
            <div>
              <p className="form-section-title">
                <i className="fas fa-user" style={{ fontSize: "0.7rem", color: "#e9c176" }} />
                Datos del cliente
              </p>

              <div className="cm-grid">
                {/* Nombre */}
                <div className="cm-field">
                  <label className="input-label">Nombre *</label>
                  <input
                    type="text"
                    className={`form-input ${errors.cliente.nombre ? "error" : ""}`}
                    placeholder="Solo letras"
                    value={data.cliente.nombre}
                    onChange={(e) => {
                      const v = onlyLetters(e.target.value);
                      setCliente({ nombre: v });
                      setClienteErr("nombre", v && !validateName(v) ? "Solo letras y espacios" : "");
                    }}
                  />
                  {errors.cliente.nombre && <span className="error-message">{errors.cliente.nombre}</span>}
                </div>

                {/* Apellido */}
                <div className="cm-field">
                  <label className="input-label">Apellido *</label>
                  <input
                    type="text"
                    className={`form-input ${errors.cliente.apellido ? "error" : ""}`}
                    placeholder="Solo letras"
                    value={data.cliente.apellido ?? ""}
                    onChange={(e) => {
                      const v = onlyLetters(e.target.value);
                      setCliente({ apellido: v });
                      setClienteErr("apellido", v && !validateName(v) ? "Solo letras y espacios" : "");
                    }}
                  />
                  {errors.cliente.apellido && <span className="error-message">{errors.cliente.apellido}</span>}
                </div>

                {/* Tipo de documento */}
                <div className="cm-field">
                  <label className="input-label">Tipo de documento *</label>
                  <select
                    className="form-input"
                    value={data.cliente.tipoDocumento ?? "DNI"}
                    onChange={(e) => {
                      const newTipo = e.target.value;
                      const trimmed = onlyDigits(data.cliente.dni ?? "").slice(0, getDocumentRule(newTipo).digits);
                      setCliente({ tipoDocumento: newTipo, dni: trimmed });
                      setClienteErr("dni", trimmed && !validateDoc(trimmed, newTipo) ? `${getDocumentRule(newTipo).digits} dígitos` : "");
                    }}
                  >
                    {DOCUMENT_RULES.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* N° de documento */}
                <div className="cm-field">
                  <label className="input-label">N° de documento *</label>
                  <input
                    type="text"
                    className={`form-input ${errors.cliente.dni ? "error" : ""}`}
                    placeholder={`${getDocumentRule(data.cliente.tipoDocumento).digits} dígitos`}
                    value={data.cliente.dni ?? ""}
                    maxLength={getDocumentRule(data.cliente.tipoDocumento).digits}
                    onChange={(e) => {
                      const rule = getDocumentRule(data.cliente.tipoDocumento);
                      const v = onlyDigits(e.target.value).slice(0, rule.digits);
                      setCliente({ dni: v });
                      setClienteErr("dni", v && !validateDoc(v, rule.value) ? `${rule.digits} dígitos` : "");
                    }}
                  />
                  {errors.cliente.dni && <span className="error-message">{errors.cliente.dni}</span>}
                </div>

                {/* Email (ancho completo) */}
                <div className="cm-field full-width">
                  <label className="input-label">Email *</label>
                  <input
                    type="email"
                    className={`form-input ${errors.cliente.email ? "error" : ""}`}
                    placeholder="correo@ejemplo.com"
                    value={data.cliente.email}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\s/g, "");
                      setCliente({ email: v });
                      setClienteErr("email", v && !validateEmail(v) ? "Email inválido" : "");
                    }}
                  />
                  {errors.cliente.email && <span className="error-message">{errors.cliente.email}</span>}
                </div>

                {/* Código de país */}
                <div className="cm-field">
                  <label className="input-label">Código de país *</label>
                  <select
                    className="form-input"
                    value={data.cliente.codigoPais ?? "+51"}
                    onChange={(e) => setCliente({ codigoPais: e.target.value, telefono: "" })}
                  >
                    {COUNTRY_CODES.map(({ code, country, flag, digits }) => (
                      <option key={code} value={code}>{flag} {code} {country} ({digits}d)</option>
                    ))}
                  </select>
                </div>

                {/* Celular */}
                <div className="cm-field">
                  <label className="input-label">Celular *</label>
                  <input
                    type="tel"
                    className={`form-input ${errors.cliente.telefono ? "error" : ""}`}
                    placeholder={`${getCountry(data.cliente.codigoPais).digits} dígitos`}
                    value={data.cliente.telefono ?? ""}
                    maxLength={20}
                    onChange={(e) => {
                      const code = data.cliente.codigoPais ?? "+51";
                      const formatted = formatPhone(e.target.value, code);
                      setCliente({ telefono: formatted });
                      setClienteErr("telefono", formatted && !validatePhone_(formatted, code) ? `${getCountry(code).digits} dígitos` : "");
                    }}
                  />
                  {errors.cliente.telefono && <span className="error-message">{errors.cliente.telefono}</span>}
                </div>
              </div>
            </div>

            {/* ── Vigencia (solo print/save) ── */}
            {(type === "print" || type === "save") && (
              <div>
                <p className="form-section-title">
                  <i className="fas fa-calendar-alt" style={{ fontSize: "0.7rem", color: "#e9c176" }} />
                  Vigencia de la cotización
                </p>
                <div className="cm-grid">
                  <div className="cm-field full-width">
                    <label className="input-label">Días de vigencia</label>
                    <div className="input-suffix-wrap">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="\d*"
                        className="form-input"
                        placeholder="7"
                        value={data.validity?.days ? String(data.validity.days) : ""}
                        onChange={(e) => {
                          const n = parseInt(onlyDigits(e.target.value) || "0", 10);
                          recalcValidity(n);
                        }}
                      />
                      <span className="input-suffix">días</span>
                    </div>
                  </div>
                  <div className="cm-field">
                    <label className="input-label">Desde</label>
                    <input type="text" className="form-input" value={data.validity?.from ?? ""} readOnly />
                  </div>
                  <div className="cm-field">
                    <label className="input-label">Hasta</label>
                    <input type="text" className="form-input" value={data.validity?.to ?? ""} readOnly />
                  </div>
                </div>
              </div>
            )}

            {/* ── Nombre del archivo (solo save) ── */}
            {type === "save" && (
              <div>
                <p className="form-section-title">
                  <i className="fas fa-file-pdf" style={{ fontSize: "0.7rem", color: "#e9c176" }} />
                  Nombre del archivo
                </p>
                <div className="cm-field">
                  <input
                    type="text"
                    className="form-input"
                    placeholder={quotationCode ?? "Se genera automáticamente"}
                    value={data.fileName !== "" ? data.fileName : (quotationCode ?? "")}
                    onChange={(e) => setData((prev) => ({ ...prev, fileName: e.target.value }))}
                  />
                  <span className="cm-filename-note">Puede editar el nombre antes de guardar</span>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* ── Footer ── */}
        <div className="contact-modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={handleSubmit}>
            <i className={`fas ${meta.icon}`} />
            {meta.submit}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ContactModal;