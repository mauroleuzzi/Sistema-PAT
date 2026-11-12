import { Platform, Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Medicion, Consorcio, ProfesionalConfig, Foto } from '../types';
import { formatDate, formatLongDateEs, formatResistance } from '../lib/utils';
import { DEFAULT_PROFESIONAL_CONFIG } from '../lib/demoData';

export type PATReportType = 'protocol' | 'photos' | 'full';

export interface PATReportOptions {
  encomiendaMode?: 'con_encomienda' | 'sin_encomienda';
  forceOfficial?: boolean;
}

const formatSuelo = (s?: string) => {
  if (!s) return 'No especificado';
  const map: Record<string, string> = {
    lecho_humedo: 'Lecho Húmedo',
    lecho_seco: 'Lecho Seco',
    muy_humedo: 'Muy Húmedo',
    otros: 'Otros',
  };
  const key = s.trim().toLowerCase();
  if (map[key]) return map[key];
  return s
    .split('_')
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Abre un Visor A4 Integrado dentro de la misma aplicación (compatible 100% con iOS PWA standalone, Android y PC)
 * y dispara la impresión nativa cuando las imágenes Base64 están completamente decodificadas.
 */
const openPrintWindowWeb = (html: string, title: string) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const existing = document.getElementById('pat-inapp-pdf-viewer');
  if (existing && existing.parentNode) {
    existing.parentNode.removeChild(existing);
  }

  const overlay = document.createElement('div');
  overlay.id = 'pat-inapp-pdf-viewer';
  overlay.style.cssText =
    'position:fixed;inset:0;z-index:999999;background:#0f172a;display:flex;flex-direction:column;font-family:Arial,sans-serif;';

  const topBar = document.createElement('div');
  topBar.style.cssText =
    'background:#0f172a;color:#fff;padding:10px 14px;padding-top:max(12px, env(safe-area-inset-top));display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #334155;gap:8px;flex-shrink:0;';

  const closeBtn = document.createElement('button');
  closeBtn.innerText = '← Volver';
  closeBtn.style.cssText =
    'background:#334155;color:#fff;border:none;padding:10px 14px;border-radius:10px;font-weight:900;font-size:13px;cursor:pointer;white-space:nowrap;';

  const titleLabel = document.createElement('div');
  titleLabel.innerText = title;
  titleLabel.style.cssText =
    'font-size:12px;font-weight:800;color:#cbd5e1;text-align:center;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 4px;';

  const isNarrow = typeof window !== 'undefined' && window.innerWidth < 480;
  const printBtn = document.createElement('button');
  printBtn.innerText = isNarrow ? 'Imprimir / PDF' : 'Imprimir / Guardar PDF';
  printBtn.style.cssText =
    'background:#1F4FFF;color:#fff;border:none;padding:10px 14px;border-radius:10px;font-weight:900;font-size:13px;cursor:pointer;white-space:nowrap;';

  const iframeWrapper = document.createElement('div');
  iframeWrapper.style.cssText =
    'flex:1;background:#cbd5e1;overflow:auto;display:flex;justify-content:center;padding:10px;-webkit-overflow-scrolling:touch;';

  const iframe = document.createElement('iframe');
  iframe.style.cssText =
    'width:100%;max-width:820px;height:100%;min-height:920px;border:none;background:#ffffff;border-radius:8px;box-shadow:0 10px 25px rgba(0,0,0,0.3);';

  const closeOverlay = () => {
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  };

  closeBtn.onclick = closeOverlay;

  const triggerIframePrint = async () => {
    try {
      const win = iframe.contentWindow;
      const doc = iframe.contentDocument || win?.document;
      if (!win || !doc) return;

      const imgs = Array.from(doc.images || []);
      await Promise.all(
        imgs.map(img => {
          if (img.complete && img.naturalHeight !== 0) {
            return img.decode ? img.decode().catch(() => {}) : Promise.resolve();
          }
          return new Promise<void>(resolve => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
            setTimeout(resolve, 1500);
          });
        })
      );

      win.focus();
      win.print();
    } catch (e) {
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(html);
        w.document.close();
        setTimeout(() => {
          w.focus();
          w.print();
        }, 800);
      }
    }
  };

  printBtn.onclick = triggerIframePrint;

  topBar.appendChild(closeBtn);
  topBar.appendChild(titleLabel);
  topBar.appendChild(printBtn);
  iframeWrapper.appendChild(iframe);
  overlay.appendChild(topBar);
  overlay.appendChild(iframeWrapper);
  document.body.appendChild(overlay);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();
  }
};

export const buildPATReportHtml = (
  medicion: Medicion,
  consorcio: Consorcio,
  type: PATReportType,
  config: ProfesionalConfig = DEFAULT_PROFESIONAL_CONFIG,
  options: PATReportOptions = {}
): string => {
  const defaultSvg = `<svg width="200" height="70" xmlns="http://www.w3.org/2000/svg"><path d="M10 55 Q 30 20 55 50 T 100 45 T 150 15 T 195 40" stroke="#1e293b" stroke-width="2.5" fill="none"/></svg>`;
  const base64Svg =
    typeof btoa === 'function'
      ? `data:image/svg+xml;base64,${btoa(defaultSvg)}`
      : `data:image/svg+xml;utf8,${encodeURIComponent(defaultSvg)}`;
  const signatureSrc = config.firmaUrl && config.firmaUrl.trim() !== '' ? config.firmaUrl : base64Svg;

  const isOfficial = options.forceOfficial || medicion.estado === 'aprobado' || medicion.estado === 'pdf_generado';
  const watermarkHtml = isOfficial
    ? ''
    : `<div class="draft-watermark">
        <span>BORRADOR • REVISIÓN TÉCNICA</span>
        <small>NO VÁLIDO COMO CERTIFICADO LEGAL</small>
      </div>`;

  const isConEncomienda = (options.encomiendaMode ?? medicion.encomienda_mode) !== 'sin_encomienda';

  const medicionLongDate = formatLongDateEs(medicion.fecha_medicion);
  const year = medicion.fecha_medicion?.substring(0, 4) ?? String(new Date().getFullYear());
  const dir = (consorcio.direccion || 'SIN DIRECCION').toUpperCase();
  const dateStr = medicion.fecha_medicion?.substring(0, 10) ?? year;
  const jurCorta = config.jurisdiccionCorta || 'C.A.B.A.';
  const jurLarga = config.jurisdiccion || 'Ciudad Autónoma de Buenos Aires';
  const entidad = config.entidad || 'COPIME';

  const docTitle =
    type === 'protocol'
      ? `${isConEncomienda ? 'PROTOCOLO' : 'CERTIFICADO'} PAT ${year} - ${dir}`
      : type === 'photos'
      ? `ANEXO FOTOS PAT ${dateStr} - ${dir}`
      : `INFORME COMPLETO PAT ${year} - ${dir}`;

  const validTableroPhoto =
    medicion.foto_tablero_url && !medicion.foto_tablero_url.startsWith('blob:')
      ? medicion.foto_tablero_url
      : undefined;
  const validTierraPhoto =
    medicion.foto_tierra_url && !medicion.foto_tierra_url.startsWith('blob:')
      ? medicion.foto_tierra_url
      : undefined;

  const puntos = medicion.puntos_medicion || [];
  const hasMultiplePuntos = puntos.length > 1;
  const puntosHtml = hasMultiplePuntos
    ? `
    <div class="section-title">Detalle de Puntos / Jabalinas Relevadas (${puntos.length})</div>
    <div class="puntos-grid">
      ${puntos
        .map(
          (p, idx) => `
        <div class="punto-item">
          <div><span class="punto-name">#${idx + 1} ${p.etiqueta || 'Jabalina'}</span> <span class="punto-loc">${p.locacion ? `(${p.locacion})` : ''}</span></div>
          <div style="display:flex;align-items:center;">
            <span class="punto-val">${formatResistance(p.valor)} Ω</span>
            <span class="punto-badge ${p.valor <= 40 ? 'ok' : 'err'}">${p.valor <= 10 ? 'Óptimo' : p.valor <= 40 ? 'Admisible' : 'Elevado'}</span>
          </div>
        </div>
      `
        )
        .join('')}
    </div>`
    : '';

  const protocolHeaderTitle = isConEncomienda
    ? 'PROTOCOLO DE MEDICIÓN DE RESISTENCIA DE PUESTA A TIERRA'
    : 'CERTIFICADO DE MEDICIÓN DE PUESTA A TIERRA - RELEVAMIENTO TÉCNICO';

  const protocolHeaderSub = isConEncomienda
    ? `Conforme a "Recomendación ${entidad} H y ST Nº 2.0 – julio/2011" • Res. SRT 900/15`
    : `Relevamiento y Verificación de Continuidad de P.A.T. • Res. SRT 900/15 y AEA 90364`;

  const protocolAdjuntos = isConEncomienda
    ? `<b>1-</b> Encomienda Profesional emitida por el ${entidad} &nbsp;&nbsp;
       <b>2-</b> Fotografías de ubicación de jabalinas y Tableros &nbsp;&nbsp;
       <b>3-</b> Certificado de calibración del instrumento`
    : `<b>1-</b> Registro de mediciones técnicas y ensayo de continuidad &nbsp;&nbsp;
       <b>2-</b> Fotografías de ubicación de jabalinas y Tableros &nbsp;&nbsp;
       <b>3-</b> Certificado de calibración del instrumento`;

  const protocolDisclaimer = isConEncomienda
    ? `ESTE PROTOCOLO NO TIENE VALIDEZ SI NO ES ACOMPAÑADO POR LA ENCOMIENDA PROFESIONAL EMITIDA POR EL ${entidad}`
    : `DOCUMENTO DE RELEVAMIENTO TÉCNICO EMITIDO POR PROFESIONAL MATRICULADO • NO INCLUYE ARANCEL DE ENCOMIENDA COLEGIAL`;

  const protocolSectionHtml = `
  <div class="page-sheet">
    ${watermarkHtml}
    <div class="hdr">
      <h1>${protocolHeaderTitle}</h1>
      <p>${protocolHeaderSub}</p>
    </div>

    <div class="section-title">Datos del Protocolo</div>
    <div class="grid" style="margin-bottom:5px;">
      <div class="cell"><div class="label">Solicitante</div><div class="val">${(consorcio.solicitante || dir).toUpperCase()}</div></div>
      <div class="cell"><div class="label">Domicilio</div><div class="val">${dir} - ${jurCorta}</div></div>
    </div>
    <div class="grid" style="margin-bottom:5px;">
      <div class="cell" style="grid-column:span 2;"><div class="label">Localización de la medición</div><div class="val">${medicion.locacion || 'Jabalina ubicada debajo tablero seccional general'}</div></div>
    </div>
    <div class="grid" style="margin-bottom:8px;">
      <div class="cell"><div class="label">Variable medida</div><div class="val">Resistencia de Puesta a Tierra</div></div>
      <div class="cell"><div class="label">Uso</div><div class="val">Toma de Tierra de Seguridad</div></div>
      <div class="cell"><div class="label">Instrumento utilizado</div><div class="val">${config.instrumento}</div></div>
      <div class="cell"><div class="label">Condición del suelo</div><div class="val">${formatSuelo(medicion.condicion_suelo)}</div></div>
      <div class="cell" style="grid-column:span 2;"><div class="label">Método de medición</div><div class="val">${config.metodo}</div></div>
    </div>

    <div class="result-hero">
      <div class="result-hero-left">
        <div class="badge">Resultado obtenido</div>
        <div class="date-val">${formatDate(medicion.fecha_medicion)}</div>
      </div>
      <div class="value">${formatResistance(medicion.resultado)} Ω</div>
      <div class="sub">Resistencia de<br>Puesta a Tierra</div>
    </div>

    ${puntosHtml}

    <div class="section-title">Observaciones</div>
    <div class="obs-block" style="${hasMultiplePuntos ? 'min-height:16mm;' : ''}">${medicion.observaciones || 'Sin observaciones adicionales. La instalación cumple con los niveles de seguridad requeridos.'}</div>

    <div class="section-title">Adjuntos</div>
    <div class="adj-strip">
      ${protocolAdjuntos}
    </div>

    <div class="section-title">Profesional Responsable</div>
    <div class="footer-grid">
      <div>
        <div class="prof-name">${config.nombre}</div>
        <div class="detail">Matrícula ${entidad} Nro.: <b>${config.matricula}</b></div>
        <div class="detail">Profesional registrado en el ${entidad}</div>
        <div class="date-line"><b>Lugar y Fecha:</b> ${jurLarga}, ${medicionLongDate}</div>
      </div>
      <div class="sig-area">
        <span style="font-size:7pt;color:#777;display:block;margin-bottom:3px;">Firma del Profesional</span>
        <img src="${signatureSrc}" alt="Firma Profesional" />
        <span>─────────────────</span>
      </div>
    </div>

    <div class="disclaimer">
      ${protocolDisclaimer}
    </div>
  </div>`;

  const tierraCardHtml = validTierraPhoto
    ? `<div class="photo-card">
        <h2>2. Toma de Tierra - PAT</h2>
        <p>${medicion.locacion || 'Toma de tierra general'}</p>
        <div class="photo-box">
          <img src="${validTierraPhoto}" alt="Foto Toma de Tierra PAT" onerror="this.style.display='none';this.parentElement.innerHTML='<div class=img-placeholder>[ FOTO TOMA DE TIERRA P.A.T. ]</div>';" />
        </div>
      </div>`
    : `<div class="photo-card">
        <h2>2. Toma de Tierra - PAT</h2>
        <p>${medicion.locacion || 'Toma de tierra general'}</p>
        <div class="photo-box">
          <div class="no-photo-notice">
            <div class="no-photo-icon">⚡</div>
            <div class="no-photo-title">ELECTRODO NO VISIBLE / BAJO SOLADO</div>
            <div class="no-photo-reason">${medicion.tierra_motivo_no_visible || 'Bajo solado o contrapiso sin cámara accesible'}</div>
            <p class="no-photo-desc">
              La jabalina o electrodo de dispersión se encuentra embutido bajo nivel de piso terminado o en sector inaccesible sin cámara de inspección registrable al momento del relevamiento.
              <br/><br/>
              La verificación técnica de continuidad y el ensayo de resistencia se realizaron sobre la bornera / barra equipotencial de puesta a tierra del Tablero Seccional General.
            </p>
            <div class="no-photo-status">Continuidad de conductor PE: <b>VERIFICADA Y CONFORME</b></div>
          </div>
        </div>
      </div>`;

  const photosSectionHtml = `
  <div class="page-sheet">
    ${watermarkHtml}
    <div class="hdr" style="display:flex;justify-content:space-between;align-items:center;">
      <div>
        <h1>ANEXO FOTOGRÁFICO — PUESTA A TIERRA</h1>
        <p>${consorcio.solicitante} • ${dir} - ${jurCorta}</p>
      </div>
      <div style="text-align:right;font-size:8pt;color:#cbd5e1;white-space:nowrap;">
        Fecha: <b>${formatDate(medicion.fecha_medicion)}</b><br/>
        Valor medido: <b>${formatResistance(medicion.resultado)} Ω</b>
      </div>
    </div>

    <div class="photo-grid">
      <div class="photo-card">
        <h2>1. Tablero Seccional</h2>
        <p>Tablero eléctrico seccional / general</p>
        <div class="photo-box">
          ${
            validTableroPhoto
              ? `<img src="${validTableroPhoto}" alt="Foto Tablero Seccional" onerror="this.style.display='none';this.parentElement.innerHTML='<div class=img-placeholder>[ FOTO TABLERO SECCIONAL ]</div>';" />`
              : `<div class="img-placeholder">[ FOTO TABLERO SECCIONAL ]</div>`
          }
        </div>
      </div>

      ${tierraCardHtml}
    </div>

    <div class="footer-grid" style="margin-top:6px;">
      <div>
        <div class="prof-name">${config.nombre}</div>
        <div class="detail">Matrícula ${entidad} Nro.: <b>${config.matricula}</b> • Instrumento: <b>${config.instrumento}</b></div>
        <div class="date-line"><b>Lugar y Fecha:</b> ${jurLarga}, ${medicionLongDate}</div>
      </div>
      <div class="sig-area">
        <span style="font-size:7pt;color:#777;display:block;margin-bottom:3px;">Firma del Profesional</span>
        <img src="${signatureSrc}" alt="Firma Profesional" />
        <span>─────────────────</span>
      </div>
    </div>
  </div>`;

  const bodyContent =
    type === 'protocol'
      ? protocolSectionHtml
      : type === 'photos'
      ? photosSectionHtml
      : `${protocolSectionHtml}<div class="page-break"></div>${photosSectionHtml}`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${docTitle}</title>
<style>
  @page { size: A4 portrait; margin: 12mm 15mm; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #111; line-height: 1.35; background: #fff; padding: 8px; }
  @media print { body { padding: 0; } }
  .page-sheet { width: 100%; position: relative; page-break-inside: avoid; break-inside: avoid; }
  .page-break { page-break-after: always; break-after: page; height: 1px; }
  .draft-watermark {
    position: absolute;
    top: 45%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-30deg);
    border: 4px dashed rgba(220, 38, 38, 0.4);
    background: rgba(254, 242, 242, 0.7);
    padding: 16px 32px;
    text-align: center;
    border-radius: 12px;
    pointer-events: none;
    z-index: 1000;
  }
  .draft-watermark span {
    display: block;
    font-size: 22pt;
    font-weight: 900;
    color: rgba(220, 38, 38, 0.7);
    letter-spacing: 2px;
  }
  .draft-watermark small {
    display: block;
    font-size: 9.5pt;
    font-weight: 800;
    color: rgba(185, 28, 28, 0.75);
    letter-spacing: 1px;
    margin-top: 4px;
  }
  .puntos-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 5px;
    margin-bottom: 7px;
  }
  .punto-item {
    border: 1px solid #cbd5e1;
    background: #f8fafc;
    border-radius: 4px;
    padding: 4px 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 7.5pt;
  }
  .punto-name { font-weight: 700; color: #1e293b; }
  .punto-loc { font-size: 7pt; color: #64748b; margin-left: 2px; }
  .punto-val { font-weight: 900; color: #0f172a; font-size: 8.5pt; margin: 0 6px; }
  .punto-badge { font-size: 6.5pt; font-weight: 800; padding: 2px 6px; border-radius: 3px; text-transform: uppercase; }
  .punto-badge.ok { background: #dcfce7; color: #16a344; }
  .punto-badge.err { background: #fee2e2; color: #dc2626; }

  .no-photo-notice {
    padding: 18px 14px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    background: #f8fafc;
    border: 1px dashed #94a3b8;
    border-radius: 4px;
  }
  .no-photo-icon { font-size: 26pt; color: #f59e0b; margin-bottom: 6px; }
  .no-photo-title { font-size: 9pt; font-weight: 900; color: #0f172a; margin-bottom: 4px; letter-spacing: 0.5px; }
  .no-photo-reason { font-size: 7.5pt; font-weight: 700; color: #b45309; background: #fef3c7; padding: 3px 8px; border-radius: 4px; margin-bottom: 10px; }
  .no-photo-desc { font-size: 7.5pt; color: #475569; line-height: 1.4; margin-bottom: 12px; text-align: justify; }
  .no-photo-status { font-size: 7.5pt; color: #166534; background: #dcfce7; padding: 4px 10px; border-radius: 4px; font-weight: 600; }
  .hdr { background: #2c2c2c; color: #fff; padding: 9px 14px; margin-bottom: 8px; border-radius: 4px; }
  .hdr h1 { font-size: 11.5pt; font-weight: 900; letter-spacing: 0.3px; margin-bottom: 2px; }
  .hdr p  { font-size: 7.5pt; color: #ccc; }
  .result-hero {
    display: flex; align-items: center; justify-content: center;
    background: #fff; border: 1px solid #000; padding: 10px 14px; margin-bottom: 8px; border-radius: 4px;
  }
  .result-hero-left { text-align: right; padding-right: 14px; }
  .badge { color: #8c98a4; font-size: 7pt; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; }
  .date-val { color: #555; font-size: 6.5pt; margin-top: 4px; font-weight: 500; }
  .value { font-size: 22pt; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; padding: 0 14px; white-space: nowrap; }
  .sub { font-size: 7.5pt; color: #555; text-align: left; padding-left: 14px; line-height: 1.2; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 8px; }
  .cell { border: 1px solid #999; padding: 5px 8px; border-radius: 3px; }
  .cell .label { font-size: 6.5pt; font-weight: 700; color: #555; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
  .cell .val { font-size: 9pt; font-weight: 600; color: #111; }
  .section-title {
    font-size: 6.5pt; font-weight: 700; letter-spacing: 1px; color: #666;
    text-transform: uppercase; border-bottom: 1px solid #bbb; padding-bottom: 2px; margin-bottom: 4px;
  }
  .obs-block { border: 1px solid #999; padding: 6px 8px; min-height: 22mm; margin-bottom: 8px; font-size: 8.5pt; line-height: 1.5; color: #222; border-radius: 3px; }
  .adj-strip { border: 1px solid #999; padding: 5px 8px; margin-bottom: 8px; font-size: 8pt; line-height: 1.6; color: #333; border-radius: 3px; }
  .adj-strip b { color: #111; }
  .footer-grid { display: grid; grid-template-columns: 1fr auto; gap: 10px; border: 1px solid #999; padding: 8px 10px; margin-bottom: 6px; align-items: center; border-radius: 4px; }
  .footer-grid .prof-name { font-size: 9pt; font-weight: 700; margin-bottom: 3px; }
  .footer-grid .detail   { font-size: 8pt; color: #333; margin-bottom: 2px; }
  .footer-grid .date-line { font-size: 8pt; margin-top: 4px; }
  .sig-area { text-align: center; }
  .sig-area img { width: 100px; max-height: 46px; object-fit: contain; display: block; margin: 0 auto 2px; }
  .sig-area span { font-size: 7pt; color: #777; }
  .disclaimer { text-align: center; font-size: 7pt; font-weight: 700; color: #555; letter-spacing: 0.2px; border-top: 1px solid #ccc; padding-top: 5px; }
  .photo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
  .photo-card {
    border: 1px solid #94a3b8;
    border-radius: 6px;
    padding: 7px 8px;
    text-align: center;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .photo-card h2 { font-size: 10pt; font-weight: 800; color: #0f172a; margin-bottom: 2px; }
  .photo-card p { font-size: 7.5pt; color: #475569; margin-bottom: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .photo-box {
    width: 100%;
    height: 128mm;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff;
    border-radius: 4px;
    overflow: hidden;
  }
  .photo-box img {
    max-width: 100%;
    max-height: 128mm;
    object-fit: contain;
    display: block;
    border-radius: 3px;
  }
  .img-placeholder { color: #94a3b8; font-size: 9pt; font-weight: bold; border: 1px dashed #cbd5e1; border-radius: 4px; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
  /* Vista previa en pantallas angostas (celular): no afecta la impresión A4 */
  @media screen and (max-width: 520px) {
    .photo-grid { grid-template-columns: 1fr; }
    .photo-box { height: auto; max-height: 360px; }
    .photo-box img { max-height: 360px; }
    .result-hero { flex-wrap: wrap; gap: 4px; }
    .result-hero-left { text-align: center; padding-right: 0; width: 100%; }
    .sub { display: none; }
    .hdr[style*="flex"] { flex-direction: column; align-items: flex-start !important; gap: 6px; }
    .hdr[style*="flex"] > div:last-child { text-align: left !important; }
  }
</style>
</head>
<body>
${bodyContent}
</body>
</html>`;
};

export const downloadPATReport = async (
  medicion: Medicion,
  consorcio: Consorcio,
  type: PATReportType,
  config: ProfesionalConfig = DEFAULT_PROFESIONAL_CONFIG,
  options: PATReportOptions = {}
) => {
  const html = buildPATReportHtml(medicion, consorcio, type, config, options);
  const isConEncomienda = (options.encomiendaMode ?? medicion.encomienda_mode) !== 'sin_encomienda';
  const tagEncomienda = isConEncomienda ? 'CON-ENCOMIENDA' : 'SIN-ENCOMIENDA';
  const titleLabel = `${consorcio.direccion} [${tagEncomienda}]`;

  if (Platform.OS === 'web') {
    openPrintWindowWeb(html, titleLabel);
  } else {
    try {
      const result = await Print.printToFileAsync({ html });
      if (result && result.uri) {
        await Sharing.shareAsync(result.uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'No se pudo generar el PDF.');
    }
  }
};

export const generatePATProtocol = async (
  medicion: Medicion,
  consorcio: Consorcio,
  _fotos?: Foto[],
  options: PATReportOptions = {}
) => {
  return downloadPATReport(medicion, consorcio, 'protocol', DEFAULT_PROFESIONAL_CONFIG, options);
};
