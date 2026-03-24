// ── Enums ──────────────────────────────────────────────

export type RiscoGestacional = "habitual" | "alto";
export type TipoSanguineo = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
export type StatusConsulta = "agendada" | "realizada" | "faltou";
export type StatusExame = "solicitado" | "coletado" | "resultado-disponivel";
export type StatusVacina = "pendente" | "aplicada" | "atrasada";
export type TrimestreGestacional = 1 | 2 | 3;
export type PapelProfissional = "enfermeiro" | "medico" | "gestor" | "admin";
export type RacaCor = "preta" | "parda" | "branca" | "amarela" | "indigena";
export type TipoEquipe = "eSF" | "eAP" | "eSB";

export type DescobrimentoGestacao = "teste-rapido" | "beta-hcg" | "atraso-menstrual";

export type ProgramaSocial = "nenhum" | "bolsa-familia" | "bpc-loas" | "aluguel-social" | "outros";

/** Sexo (documento de requisitos: lista suspensa obrigatória). */
export type Sexo = "FEMININO" | "MASCULINO" | "INDETERMINADO";

/** Identidade de gênero (opcional). */
export type IdentidadeGenero =
  | "mulher-cis"
  | "homem-cis"
  | "mulher-trans"
  | "homem-trans"
  | "travesti"
  | "pessoa-nao-binaria";

/** Orientação sexual (opcional). */
export type OrientacaoSexual =
  | "gay"
  | "lesbica"
  | "bissexual"
  | "pansexual"
  | "heterossexual"
  | "assexual";

/** Origem do cadastro: manual ou pesquisa na base federal (CIP). */
export type OrigemCadastro = "manual" | "cip";

/** Status do cadastro no fluxo do programa. */
export type StatusCadastro = "pendente" | "aprovado" | "recusado";

// ── Base Federal (contrato de dados da pesquisa CNS/CADWEB) ─────

/**
 * Contrato da resposta da Base Federal (ex.: CNS – PesquisarPacientePorCPF).
 * Usado apenas para mapear → modelo local; não persistir dados federais diretamente.
 */
export interface PacienteBaseFederal {
  cpf?: string | null;
  cns?: string | null;
  nome?: string | null;
  nomeSocial?: string | null;
  nomeMae?: string | null;
  nomePai?: string | null;
  dataNascimento?: string | null;
  sexo?: string | null;
  racaCor?: string | null;
  identidadeGenero?: string | null;
  orientacaoSexual?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cep?: string | null;
  municipio?: string | null;
  emails?: string | null;
  ddd?: string | null;
  telefoneCelular?: string | null;
  telefoneResidencial?: string | null;
}

/**
 * Resultado da pesquisa na Base Federal (sucesso + paciente ou mensagem de erro).
 */
export interface ResultadoPesquisaBaseFederal {
  sucesso: boolean;
  paciente?: PacienteBaseFederal | null;
  mensagem?: string;
}

// ── DTO único para busca de cidadão (e-SUS ou SOAP/CADSUS) ─────

/**
 * DTO único do cidadão retornado por qualquer provider (e-SUS ou SOAP).
 * Usado pelo CitizenLookupService para preencher o formulário de cadastro da gestante.
 */
export interface CitizenDto {
  cpf?: string | null;
  cns?: string | null;
  nomeCompleto?: string | null;
  nomeSocial?: string | null;
  nomeMae?: string | null;
  nomePai?: string | null;
  dataNascimento?: string | null;
  sexo?: string | null;
  racaCor?: string | null;
  identidadeGenero?: string | null;
  orientacaoSexual?: string | null;
  nis?: string | null;
  telefoneCelular?: string | null;
  telefoneResidencial?: string | null;
  email?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  pontoReferencia?: string | null;
  municipio?: string | null;
  unidadeSaude?: string | null;
  equipeSaude?: string | null;
  possuiHistoricoPreNatal?: boolean;
  dataUltimoAtendimentoPreNatal?: string | null;
}

// ── Cadastro da Gestante (modelo local – formulário / persistência) ─────

/**
 * Subconjunto do cadastro que pode ser pré-preenchido a partir da Base Federal.
 * Apenas dados demográficos e endereço; telefone e demais campos são locais.
 */
export interface DadosPessoaisFromFederal {
  cpf: string;
  cns?: string;
  nomeCompleto: string;
  nomeSocial?: string;
  nomeMae?: string;
  nomePai?: string;
  dataNascimento?: string;
  sexo?: Sexo;
  racaCor?: string;
  identidadeGenero?: string;
  orientacaoSexual?: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cep: string;
  municipio?: string;
  email?: string;
  telefoneCelular?: string;
  telefoneResidencial?: string;
}

/**
 * Cadastro da gestante no programa (registro local).
 * Compatível com formulário 4 páginas e futura tabela gestante/gestante_cadastro.
 */
export interface CadastroGestante {
  id: string;
  // Identificação (obrigatório: CPF ou CNS; nome completo; nome mãe/pai; data nasc.; sexo; raça; deficiência)
  cpf: string;
  cns?: string;
  nomeCompleto: string;
  nomeSocial?: string;
  nomeMae: string;
  nomePai: string;
  dataNascimento: string;
  sexo: Sexo;
  racaCor: RacaCor;
  identidadeGenero?: IdentidadeGenero;
  orientacaoSexual?: OrientacaoSexual;
  possuiDeficiencia: boolean;
  deficiencia?: string;
  nomeSocialPrincipal?: boolean;
  // Contato
  telefone: string;
  temWhatsapp: boolean;
  email?: string;
  // Endereço
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cep: string;
  distritoSanitarioId?: string;
  // Gestação
  descobrimentoGestacao: DescobrimentoGestacao;
  dum?: string;
  programaSocial: ProgramaSocial;
  nis?: string;
  planoSaude?: "sim" | "nao";
  manterAcompanhamentoUbs?: "sim" | "nao";
  // Vínculo
  ubsId: string;
  maternidadeReferencia?: string;
  cartaoMaeSalvador?: boolean;
  // Histórico obstétrico (opcional)
  gestacoesPrevias?: number;
  partosNormal?: number;
  partosCesareo?: number;
  abortos?: number;
  // Saúde (opcional)
  alergias?: string;
  doencasConhecidas?: string;
  medicacoesEmUso?: string;
  // Origem e vínculos externos
  origemCadastro: OrigemCadastro;
  idCidadaoCip?: number;
  coCidadaoEsus?: number;
  // Controle
  senhaHash?: string;
  dataCadastro: string;
  status: StatusCadastro;
  criadoEm: string;
  atualizadoEm: string;
}

/** Payload para criar/atualizar cadastro (sem id, status, criadoEm, atualizadoEm). */
export type GestanteCadastroInput = Omit<
  CadastroGestante,
  "id" | "status" | "criadoEm" | "atualizadoEm"
>;

// ── Gestante ───────────────────────────────────────────

export interface Gestante {
  id: string;
  nomeCompleto: string;
  cpf: string;
  cns?: string;
  dataNascimento: string; // ISO date
  telefone: string;
  email?: string;
  endereco: Endereco;
  tipoSanguineo?: TipoSanguineo;
  // Dados obstétricos
  gestacoes: number;
  partos: number;
  abortos: number;
  filhosVivos: number;
  // Gestação atual
  dum: string; // Data última menstruação (ISO date)
  dpp: string; // Data provável do parto (ISO date)
  idadeGestacionalSemanas: number;
  riscoGestacional: RiscoGestacional;
  fatoresRisco: string[];
  // Vínculo
  ubsId: string;
  maternidadeReferencia: string;
  profissionalResponsavelId: string;
  // Programa
  cartaoMaeSalvador: boolean;
  bolsaFamilia: boolean;
  racaCor: RacaCor;
  equipeId: string;
  // Meta
  dataCadastro: string;
  ativa: boolean;
}

export interface Endereco {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cep: string;
  distritoSanitarioId: string;
}

// ── Consulta Pré-natal ─────────────────────────────────

export interface ConsultaPreNatal {
  id: string;
  gestanteId: string;
  profissionalId: string;
  ubsId: string;
  data: string;
  idadeGestacionalSemanas: number;
  status: StatusConsulta;
  // Dados clínicos
  pesoKg?: number;
  pressaoSistolica?: number;
  pressaoDiastolica?: number;
  alturaUterinaСm?: number;
  bcf?: number; // Batimentos cardíacos fetais
  edema?: "ausente" | "leve" | "moderado" | "grave";
  apresentacaoFetal?: string;
  movimentosFetais?: boolean;
  // Avaliação
  queixas?: string;
  conduta?: string;
  observacoes?: string;
  riscoAtualizado?: RiscoGestacional;
}

// ── Exame ──────────────────────────────────────────────

export interface Exame {
  id: string;
  gestanteId: string;
  tipo: string;
  nome: string;
  dataSolicitacao: string;
  dataResultado?: string;
  resultado?: string;
  valorReferencia?: string;
  status: StatusExame;
  trimestre: TrimestreGestacional;
  observacoes?: string;
}

// ── Vacina ─────────────────────────────────────────────

export interface Vacina {
  id: string;
  gestanteId: string;
  nome: string;
  dose: string;
  dataAplicacao?: string;
  dataPrevista: string;
  status: StatusVacina;
  lote?: string;
  localAplicacao?: string;
}

// ── Medicação ──────────────────────────────────────────

export interface Medicacao {
  id: string;
  gestanteId: string;
  nome: string;
  dosagem: string;
  frequencia: string;
  dataInicio: string;
  dataFim?: string;
  observacoes?: string;
  ativa: boolean;
}

// ── Profissional de Saúde ──────────────────────────────

export interface Profissional {
  id: string;
  nomeCompleto: string;
  cpf: string;
  cns?: string;
  papel: PapelProfissional;
  cbo: string; // Classificação Brasileira de Ocupações
  conselho?: string; // CRM, COREN, etc.
  ubsIds: string[];
}

// ── UBS / Unidade de Saúde ─────────────────────────────

export interface UBS {
  id: string;
  nome: string;
  cnes: string;
  tipo: "USF" | "UBS";
  distritoSanitarioId: string;
  endereco: Endereco;
  telefone?: string;
  equipesSF: number;
}

export interface DistritoSanitario {
  id: string;
  nome: string;
  numero: number;
}

// ── Equipe de Saúde ────────────────────────────────────

export interface Equipe {
  id: string;
  nome: string;
  ubsId: string;
  tipo: TipoEquipe;
}

// ── Transcard / Programa Mãe Salvador ──────────────────

export type EtapaMaeSalvador = 1 | 2 | 3;
export type SituacaoTranscard = "ativo" | "inconsistencia" | "pendente" | "recusado";

export interface TranscardVinculacao {
  id: string;
  gestanteId: string;
  numeroTranscard: string;
  cpf: string;
  situacao: SituacaoTranscard;
  dataVinculacao: string;
  etapaAtual: EtapaMaeSalvador;
  lgpdConsentimento: "assinado-digital" | "assinado-fisico" | "pendente";
  recusouTranscard: boolean;
  recusouKitEnxoval: boolean;
  encaminhadaCras: boolean;
  dataEncaminhamentoCras?: string;
}

// ── Atividade Educativa / Visita Maternidade ──────────

export interface AtividadeEducativa {
  id: string;
  gestanteId: string;
  data: string;
  descricao: string;
  profissionalId: string;
}

export interface VisitaMaternidade {
  id: string;
  gestanteId: string;
  data: string;
  maternidade: string;
  profissionalId: string;
  observacoes?: string;
}

// ── Sífilis na Gestação ────────────────────────────────

export type ClassificacaoSifilis = "recente" | "tardia" | "indeterminada";

export interface CasoSifilis {
  id: string;
  gestanteId: string;
  classificacao: ClassificacaoSifilis;
  dataDeteccao: string;
  idadeGestacionalDeteccao: number;
  tratamentoIniciado: boolean;
  tratamentoConcluido: boolean;
  parceiroTratado: boolean;
}

// ── Indicadores Previne Brasil (por quadrimestre) ──────

export interface IndicadorPrevine {
  id: string;
  nome: string;
  meta: number;
  valores: { quadrimestre: string; valor: number }[];
}

// ── Notificação ────────────────────────────────────────

export interface Notificacao {
  id: string;
  gestanteId: string;
  titulo: string;
  mensagem: string;
  tipo: "consulta" | "exame" | "vacina" | "geral";
  lida: boolean;
  data: string;
}

// ── Registro de Peso (para gráfico) ───────────────────

export interface RegistroPeso {
  data: string;
  idadeGestacionalSemanas: number;
  pesoKg: number;
  imcAtual: number;
}

// ── Dashboard Gestor KPIs ──────────────────────────────

export interface KPIsGestor {
  gestantesAtivas: number;
  consultasRealizadasMes: number;
  inicioPrecoce: number; // % com início ≤12 semanas
  seteMaisConsultas: number; // % com 7+ consultas
  coberturaVacinalDtpa: number;
  coberturaVacinalInfluenza: number;
  examesPrimeiroTrimestre: number; // %
  distribuicaoRisco: {
    habitual: number;
    alto: number;
  };
}
