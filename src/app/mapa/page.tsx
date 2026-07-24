import { getBancas, getSegmentos } from "@/lib/data";
import MapaBancas from "./MapaBancas";

export const dynamic = "force-dynamic";

export default async function MapaPage() {
  const [bancas, segmentos] = await Promise.all([getBancas(), getSegmentos()]);

  return (
    <section className="py-14">
      <div className="container-page">
        <h1 className="text-2xl font-extrabold text-navy">Mapa de Bancas</h1>
        <p className="mb-6 mt-1 max-w-2xl text-muted">
          Explore as bancas por pavimento e segmento. As vagas em aberto vão para o próximo sorteio
          público. Nenhum dado pessoal é exibido aqui.
        </p>
        <MapaBancas bancas={bancas} segmentos={segmentos} />
      </div>
    </section>
  );
}
