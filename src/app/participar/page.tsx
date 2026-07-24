const STEPS = [
  ["Início", "Manifestação de interesse", "Preencha o pré-cadastro online e entre na lista de espera para os próximos editais."],
  ["Edital", "Publicação do edital", "O poder público publica edital (validade de 2 anos) com prazos, requisitos e as bancas vagas."],
  ["Documentos", "Habilitação", "Foto 3x4, identidade, comprovante de residência em Santa Maria, CTPS sem vínculo e comprovante de renda/IR."],
  ["Sorteio", "Sorteio público", "A partir de 2 bancas vagas, sorteio com representantes do poder público, da concessionária e dos comerciantes."],
  ["Contrato", "Autorização de uso", "Contemplado assina o contrato com a concessionária e recebe a banca."],
  ["Depois", "Recadastramento semestral", "A cada 6 meses, atualização cadastral do titular e do auxiliar para manter a autorização."],
];

export default function ParticiparPage() {
  return (
    <section className="py-14">
      <div className="container-page">
        <h1 className="text-2xl font-extrabold text-navy">Como Participar</h1>
        <p className="mb-6 mt-1 max-w-2xl text-muted">
          Da manifestação de interesse ao contrato da banca — o caminho é definido pelo Decreto de
          Normas de Funcionamento do Shopping Independência.
        </p>

        <ol className="grid gap-3.5">
          {STEPS.map(([tag, titulo, texto], i) => (
            <li
              key={i}
              className="relative rounded-xl border border-line border-l-4 border-l-accent bg-white py-4 pl-16 pr-5"
            >
              <span className="absolute left-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-navy font-extrabold text-white">
                {i + 1}
              </span>
              <span className="absolute right-4 top-5 text-[11px] font-bold uppercase tracking-wide text-accent">
                {tag}
              </span>
              <h4 className="font-bold text-navy">{titulo}</h4>
              <p className="mt-0.5 text-sm text-muted">{texto}</p>
            </li>
          ))}
        </ol>

        <div className="mt-6 rounded-2xl border border-line border-l-4 border-l-accent bg-white p-5">
          <h3 className="font-bold text-navy">Quem pode participar</h3>
          <p className="mt-1 text-sm text-muted">
            Maiores de 18 anos, residentes em Santa Maria, sem vínculo empregatício ou outra renda
            (salvo MEI ou benefício temporário) e sem comércio já estabelecido na cidade.
          </p>
        </div>
      </div>
    </section>
  );
}
