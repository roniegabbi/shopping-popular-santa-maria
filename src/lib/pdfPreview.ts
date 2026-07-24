import type { jsPDF } from "jspdf";

export type Logo = { dataUrl: string; w: number; h: number };

/** Baixa a logo (Supabase Storage) e converte para dataURL + dimensões. */
export async function carregarLogo(url?: string | null): Promise<Logo | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: "no-store" });
    const blob = await res.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
    const dims: { w: number; h: number } = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
      img.onerror = () => resolve({ w: 1, h: 1 });
      img.src = dataUrl;
    });
    return { dataUrl, ...dims };
  } catch {
    return null;
  }
}

export function logoFmt(l: Logo): "PNG" | "JPEG" {
  return l.dataUrl.includes("image/jpeg") || l.dataUrl.includes("image/jpg") ? "JPEG" : "PNG";
}

/** Abre uma prévia do PDF em modal, com botões Baixar e Fechar. */
export function previewPdf(doc: jsPDF, filename: string) {
  let url: string;
  try {
    const blob = doc.output("blob") as Blob;
    url = URL.createObjectURL(blob);
  } catch (err) {
    try {
      doc.save(filename);
    } catch {
      alert("Não foi possível gerar o PDF: " + (err instanceof Error ? err.message : String(err)));
    }
    return;
  }

  const overlay = document.createElement("div");
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:99999;background:rgba(20,10,30,.6);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:18px;";

  const bar = document.createElement("div");
  bar.style.cssText =
    "width:100%;max-width:900px;display:flex;align-items:center;gap:10px;background:#3D1A5B;color:#fff;padding:10px 14px;border-radius:12px 12px 0 0;font-family:-apple-system,Segoe UI,Roboto,sans-serif;";
  const titulo = document.createElement("span");
  titulo.textContent = filename;
  titulo.style.cssText = "font-weight:600;font-size:14px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
  bar.appendChild(titulo);

  const baixar = document.createElement("button");
  baixar.textContent = "Baixar PDF";
  baixar.style.cssText = "background:#F7901E;color:#fff;border:0;border-radius:8px;padding:8px 14px;font-weight:600;cursor:pointer;font-size:13px;";
  baixar.onclick = () => doc.save(filename);

  const abrir = document.createElement("button");
  abrir.textContent = "Abrir em nova aba";
  abrir.style.cssText = "background:rgba(255,255,255,.15);color:#fff;border:0;border-radius:8px;padding:8px 14px;font-weight:600;cursor:pointer;font-size:13px;";
  abrir.onclick = () => window.open(url, "_blank");

  const fechar = document.createElement("button");
  fechar.textContent = "Fechar";
  fechar.style.cssText = "background:rgba(255,255,255,.15);color:#fff;border:0;border-radius:8px;padding:8px 14px;font-weight:600;cursor:pointer;font-size:13px;";
  const close = () => {
    if (overlay.parentNode) document.body.removeChild(overlay);
    URL.revokeObjectURL(url);
  };
  fechar.onclick = close;
  overlay.onclick = (e) => { if (e.target === overlay) close(); };

  bar.appendChild(baixar);
  bar.appendChild(abrir);
  bar.appendChild(fechar);

  const frame = document.createElement("iframe");
  frame.src = url;
  frame.style.cssText = "width:100%;max-width:900px;height:80vh;border:0;border-radius:0 0 12px 12px;background:#fff;";

  overlay.appendChild(bar);
  overlay.appendChild(frame);
  document.body.appendChild(overlay);
}
