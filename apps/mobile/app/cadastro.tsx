import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useAuthStore } from "@/store/auth-store";
import Colors from "@/constants/Colors";

// Inline UBS/distrito data (shared pkg not wired in mobile)
const DISTRITOS = [
  { id: "ds-01", nome: "Centro Histórico" },
  { id: "ds-02", nome: "Itapagipe" },
  { id: "ds-03", nome: "São Caetano / Valéria" },
  { id: "ds-04", nome: "Liberdade" },
  { id: "ds-05", nome: "Brotas" },
  { id: "ds-06", nome: "Barra / Rio Vermelho" },
  { id: "ds-07", nome: "Boca do Rio" },
  { id: "ds-08", nome: "Itapuã" },
  { id: "ds-09", nome: "Cabula / Beiru" },
  { id: "ds-10", nome: "Pau da Lima" },
  { id: "ds-11", nome: "Subúrbio Ferroviário" },
  { id: "ds-12", nome: "Cajazeiras" },
];

const UBS_LIST = [
  { id: "ubs-001", nome: "USF Bairro da Paz", distritoId: "ds-08" },
  { id: "ubs-002", nome: "USF Cajazeiras X", distritoId: "ds-12" },
  { id: "ubs-003", nome: "UBS Ramiro de Azevedo", distritoId: "ds-01" },
  { id: "ubs-004", nome: "USF Pau da Lima", distritoId: "ds-10" },
  { id: "ubs-005", nome: "USF Vale do Camurugipe", distritoId: "ds-09" },
  { id: "ubs-006", nome: "USF Liberdade", distritoId: "ds-04" },
  { id: "ubs-007", nome: "USF São Marcos", distritoId: "ds-03" },
  { id: "ubs-008", nome: "UBS Nelson Piauhy Dourado", distritoId: "ds-06" },
];

const IDENTIDADE_GENERO = [
  { value: "mulher-cis", label: "Mulher cisgênero" },
  { value: "mulher-trans", label: "Mulher transgênero" },
  { value: "homem-trans", label: "Homem transgênero" },
  { value: "nao-binario", label: "Não-binário" },
  { value: "outro", label: "Outro" },
  { value: "prefere-nao-declarar", label: "Prefere não declarar" },
];

const ORIENTACAO_SEXUAL = [
  { value: "heterossexual", label: "Heterossexual" },
  { value: "homossexual", label: "Homossexual" },
  { value: "bissexual", label: "Bissexual" },
  { value: "assexual", label: "Assexual" },
  { value: "outro", label: "Outro" },
  { value: "prefere-nao-declarar", label: "Prefere não declarar" },
];

const PROGRAMAS_SOCIAIS = [
  { value: "nenhum", label: "Nenhum" },
  { value: "bolsa-familia", label: "Bolsa Família" },
  { value: "bpc-loas", label: "BPC/LOAS" },
  { value: "aluguel-social", label: "Aluguel Social" },
  { value: "outros", label: "Outros" },
];

const STEPS = [
  "Identificação",
  "Endereço",
  "Gestação",
  "Unidade de Saúde",
  "Histórico",
];
const LAST_STEP = STEPS.length - 1;

// ── Formatters ─────────────────────────────────────────

function fmtCpf(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function fmtCns(v: string) {
  return v.replace(/\D/g, "").slice(0, 15);
}

function fmtPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function fmtCep(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function fmtDate(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

// ── Reusable components ────────────────────────────────

const Field = ({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>
      {label}
      {required && <Text style={{ color: Colors.danger }}> *</Text>}
    </Text>
    {hint && <Text style={styles.fieldHint}>{hint}</Text>}
    {children}
  </View>
);

const Input = ({
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: "default" | "numeric" | "phone-pad";
}) => (
  <TextInput
    style={styles.input}
    value={value}
    onChangeText={onChangeText}
    placeholder={placeholder}
    placeholderTextColor={Colors.textMuted}
    keyboardType={keyboardType}
  />
);

const OptionButton = ({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.optionBtn, selected && styles.optionBtnSelected]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    {selected && (
      <FontAwesome name="check-circle" size={14} color={Colors.primary} />
    )}
    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const SectionHeader = ({ title, badge }: { title: string; badge?: string }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {badge && (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{badge}</Text>
      </View>
    )}
  </View>
);

export default function CadastroScreen() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  // Step 0 – Identificação
  const [cpf, setCpf] = useState("");
  const [cns, setCns] = useState("");
  const [nome, setNome] = useState("");
  const [nomeSocial, setNomeSocial] = useState("");
  const [identidadeGenero, setIdentidadeGenero] = useState("");
  const [orientacaoSexual, setOrientacaoSexual] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [telefone, setTelefone] = useState("");
  const [temWhatsapp, setTemWhatsapp] = useState(false);

  // Step 1 – Endereço
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cep, setCep] = useState("");

  // Step 2 – Gestação & Social
  const [descobrimento, setDescobrimento] = useState("");
  const [dum, setDum] = useState("");
  const [programaSocial, setProgramaSocial] = useState("");
  const [nis, setNis] = useState("");
  const [planoSaude, setPlanoSaude] = useState("");
  const [manterUbs, setManterUbs] = useState("");

  // Step 3 – UBS
  const [distritoId, setDistritoId] = useState("");
  const [ubsId, setUbsId] = useState("");

  // Step 4 – Histórico (optional)
  const [gestacoesPrevias, setGestacoesPrevias] = useState("");
  const [partosCesareo, setPartosCesareo] = useState("");
  const [partosNormal, setPartosNormal] = useState("");
  const [abortos, setAbortos] = useState("");
  const [alergias, setAlergias] = useState("");
  const [doencas, setDoencas] = useState("");
  const [medicacoes, setMedicacoes] = useState("");

  const ubsFiltered = distritoId
    ? UBS_LIST.filter((u) => u.distritoId === distritoId)
    : UBS_LIST;

  const hasCpf = cpf.replace(/\D/g, "").length === 11;
  const hasCns = cns.replace(/\D/g, "").length === 15;

  function canAdvance() {
    switch (step) {
      case 0:
        return (
          (hasCpf || hasCns) &&
          nome.trim().length > 0 &&
          telefone.replace(/\D/g, "").length >= 10
        );
      case 1:
        return (
          logradouro.trim().length > 0 &&
          numero.trim().length > 0 &&
          bairro.trim().length > 0 &&
          cep.replace(/\D/g, "").length === 8
        );
      case 2:
        return descobrimento !== "" && programaSocial !== "";
      case 3:
        return ubsId !== "";
      case 4:
        return true; // all optional
      default:
        return false;
    }
  }

  function handleNext() {
    if (step < LAST_STEP) setStep(step + 1);
    else handleSubmit();
  }

  function handleSubmit() {
    setSubmitted(true);
  }

  function handleFinish() {
    login();
    router.replace("/(tabs)");
  }

  if (submitted) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successIcon}>
          <FontAwesome name="check" size={36} color="#fff" />
        </View>
        <Text style={styles.successTitle}>Cadastro realizado!</Text>
        <Text style={styles.successSub}>
          Seu pré-cadastro foi enviado. A equipe da UBS entrará em contato para
          agendar sua primeira consulta.
        </Text>
        <TouchableOpacity
          style={styles.successBtn}
          onPress={handleFinish}
          activeOpacity={0.8}
        >
          <Text style={styles.successBtnText}>Acessar caderneta</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => (step > 0 ? setStep(step - 1) : router.back())}
            style={styles.backBtn}
          >
            <FontAwesome name="arrow-left" size={16} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Cadastro</Text>
            <Text style={styles.headerStep}>
              Passo {step + 1} de {STEPS.length} — {STEPS[step]}
            </Text>
          </View>
        </View>

        {/* Progress */}
        <View style={styles.progressRow}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressDot,
                i <= step && styles.progressDotActive,
              ]}
            />
          ))}
        </View>

        {/* Form */}
        <ScrollView
          style={styles.form}
          contentContainerStyle={{ paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Step 0: Identificação ── */}
          {step === 0 && (
            <>
              <Field label="CPF" required={!hasCns} hint="Preencha CPF ou CNS">
                <Input
                  value={cpf}
                  onChangeText={(v) => setCpf(fmtCpf(v))}
                  placeholder="000.000.000-00"
                  keyboardType="numeric"
                />
              </Field>
              <Field label="CNS (Cartão Nacional de Saúde)" required={!hasCpf}>
                <Input
                  value={cns}
                  onChangeText={(v) => setCns(fmtCns(v))}
                  placeholder="000000000000000"
                  keyboardType="numeric"
                />
              </Field>
              <Field label="Nome completo" required>
                <Input
                  value={nome}
                  onChangeText={setNome}
                  placeholder="Seu nome completo"
                />
              </Field>
              <Field label="Nome social">
                <Input
                  value={nomeSocial}
                  onChangeText={setNomeSocial}
                  placeholder="Nome social (se aplicável)"
                />
              </Field>
              <Field label="Identidade de gênero">
                <View style={styles.optionsGrid}>
                  {IDENTIDADE_GENERO.map((o) => (
                    <OptionButton
                      key={o.value}
                      label={o.label}
                      selected={identidadeGenero === o.value}
                      onPress={() =>
                        setIdentidadeGenero(
                          identidadeGenero === o.value ? "" : o.value,
                        )
                      }
                    />
                  ))}
                </View>
              </Field>
              <Field label="Orientação sexual">
                <View style={styles.optionsGrid}>
                  {ORIENTACAO_SEXUAL.map((o) => (
                    <OptionButton
                      key={o.value}
                      label={o.label}
                      selected={orientacaoSexual === o.value}
                      onPress={() =>
                        setOrientacaoSexual(
                          orientacaoSexual === o.value ? "" : o.value,
                        )
                      }
                    />
                  ))}
                </View>
              </Field>
              <Field label="Data de nascimento">
                <Input
                  value={nascimento}
                  onChangeText={(v) => setNascimento(fmtDate(v))}
                  placeholder="DD/MM/AAAA"
                  keyboardType="numeric"
                />
              </Field>
              <Field label="Telefone" required>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Input
                      value={telefone}
                      onChangeText={(v) => setTelefone(fmtPhone(v))}
                      placeholder="(71) 99999-9999"
                      keyboardType="phone-pad"
                    />
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.whatsappBtn,
                      temWhatsapp && styles.whatsappBtnActive,
                    ]}
                    onPress={() => setTemWhatsapp(!temWhatsapp)}
                    activeOpacity={0.7}
                  >
                    <FontAwesome
                      name="whatsapp"
                      size={14}
                      color={temWhatsapp ? "#16a34a" : Colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.whatsappText,
                        temWhatsapp && styles.whatsappTextActive,
                      ]}
                    >
                      WhatsApp
                    </Text>
                  </TouchableOpacity>
                </View>
              </Field>
            </>
          )}

          {/* ── Step 1: Endereço ── */}
          {step === 1 && (
            <>
              <Field label="Logradouro" required>
                <Input
                  value={logradouro}
                  onChangeText={setLogradouro}
                  placeholder="Rua, Avenida, Travessa..."
                />
              </Field>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Field label="Número" required>
                    <Input
                      value={numero}
                      onChangeText={setNumero}
                      placeholder="Nº"
                    />
                  </Field>
                </View>
                <View style={{ flex: 2 }}>
                  <Field label="Complemento">
                    <Input
                      value={complemento}
                      onChangeText={setComplemento}
                      placeholder="Apto, Bloco..."
                    />
                  </Field>
                </View>
              </View>
              <Field label="Bairro" required>
                <Input
                  value={bairro}
                  onChangeText={setBairro}
                  placeholder="Bairro"
                />
              </Field>
              <Field label="CEP" required>
                <Input
                  value={cep}
                  onChangeText={(v) => setCep(fmtCep(v))}
                  placeholder="00000-000"
                  keyboardType="numeric"
                />
              </Field>
            </>
          )}

          {/* ── Step 2: Gestação & Social ── */}
          {step === 2 && (
            <>
              <Field label="Como descobriu a gestação?" required>
                <View style={styles.optionsGrid}>
                  <OptionButton
                    label="Teste rápido"
                    selected={descobrimento === "teste-rapido"}
                    onPress={() => setDescobrimento("teste-rapido")}
                  />
                  <OptionButton
                    label="Beta-HCG (Sangue)"
                    selected={descobrimento === "beta-hcg"}
                    onPress={() => setDescobrimento("beta-hcg")}
                  />
                  <OptionButton
                    label="Atraso menstrual"
                    selected={descobrimento === "atraso-menstrual"}
                    onPress={() => setDescobrimento("atraso-menstrual")}
                  />
                </View>
              </Field>
              <Field
                label="Data da última menstruação (DUM)"
                hint="Facultativo"
              >
                <Input
                  value={dum}
                  onChangeText={(v) => setDum(fmtDate(v))}
                  placeholder="DD/MM/AAAA"
                  keyboardType="numeric"
                />
              </Field>

              <View style={styles.separator} />

              <Field label="Programa social" required>
                <View style={styles.optionsGrid}>
                  {PROGRAMAS_SOCIAIS.map((o) => (
                    <OptionButton
                      key={o.value}
                      label={o.label}
                      selected={programaSocial === o.value}
                      onPress={() => {
                        setProgramaSocial(o.value);
                        if (o.value !== "bolsa-familia") setNis("");
                      }}
                    />
                  ))}
                </View>
              </Field>
              {programaSocial === "bolsa-familia" && (
                <Field label="NIS" required>
                  <Input
                    value={nis}
                    onChangeText={(v) =>
                      setNis(v.replace(/\D/g, "").slice(0, 11))
                    }
                    placeholder="Número de Identificação Social"
                    keyboardType="numeric"
                  />
                </Field>
              )}

              <Field label="Plano de saúde ou particular?">
                <View style={styles.optionsGrid}>
                  <OptionButton
                    label="Sim"
                    selected={planoSaude === "sim"}
                    onPress={() => {
                      setPlanoSaude(planoSaude === "sim" ? "" : "sim");
                      if (planoSaude === "sim") setManterUbs("");
                    }}
                  />
                  <OptionButton
                    label="Não"
                    selected={planoSaude === "nao"}
                    onPress={() => {
                      setPlanoSaude(planoSaude === "nao" ? "" : "nao");
                      setManterUbs("");
                    }}
                  />
                </View>
              </Field>
              {planoSaude === "sim" && (
                <Field label="Deseja manter acompanhamento na UBS?">
                  <View style={styles.optionsGrid}>
                    <OptionButton
                      label="Sim"
                      selected={manterUbs === "sim"}
                      onPress={() => setManterUbs("sim")}
                    />
                    <OptionButton
                      label="Não"
                      selected={manterUbs === "nao"}
                      onPress={() => setManterUbs("nao")}
                    />
                  </View>
                </Field>
              )}
            </>
          )}

          {/* ── Step 3: UBS ── */}
          {step === 3 && (
            <>
              <Field label="Distrito Sanitário">
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginHorizontal: -4 }}
                >
                  <View style={styles.chipRow}>
                    {DISTRITOS.map((d) => (
                      <TouchableOpacity
                        key={d.id}
                        style={[
                          styles.chip,
                          distritoId === d.id && styles.chipSelected,
                        ]}
                        onPress={() => {
                          setDistritoId(distritoId === d.id ? "" : d.id);
                          setUbsId("");
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            distritoId === d.id && styles.chipTextSelected,
                          ]}
                        >
                          {d.nome}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </Field>
              <Field label="Unidade de Saúde" required>
                {ubsFiltered.map((u) => (
                  <TouchableOpacity
                    key={u.id}
                    style={[
                      styles.ubsCard,
                      ubsId === u.id && styles.ubsCardSelected,
                    ]}
                    onPress={() => setUbsId(u.id)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.ubsRadio,
                        ubsId === u.id && styles.ubsRadioSelected,
                      ]}
                    >
                      {ubsId === u.id && <View style={styles.ubsRadioDot} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.ubsName,
                          ubsId === u.id && { color: Colors.primary },
                        ]}
                      >
                        {u.nome}
                      </Text>
                      <Text style={styles.ubsDistrito}>
                        {DISTRITOS.find((d) => d.id === u.distritoId)?.nome}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </Field>
            </>
          )}

          {/* ── Step 4: Histórico & Saúde (optional) ── */}
          {step === 4 && (
            <>
              <SectionHeader title="Histórico Obstétrico" badge="Facultativo" />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Field label="Gestações prévias">
                    <Input
                      value={gestacoesPrevias}
                      onChangeText={(v) =>
                        setGestacoesPrevias(v.replace(/\D/g, ""))
                      }
                      placeholder="0"
                      keyboardType="numeric"
                    />
                  </Field>
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Partos cesáreos">
                    <Input
                      value={partosCesareo}
                      onChangeText={(v) =>
                        setPartosCesareo(v.replace(/\D/g, ""))
                      }
                      placeholder="0"
                      keyboardType="numeric"
                    />
                  </Field>
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Field label="Partos normais">
                    <Input
                      value={partosNormal}
                      onChangeText={(v) =>
                        setPartosNormal(v.replace(/\D/g, ""))
                      }
                      placeholder="0"
                      keyboardType="numeric"
                    />
                  </Field>
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Abortos">
                    <Input
                      value={abortos}
                      onChangeText={(v) => setAbortos(v.replace(/\D/g, ""))}
                      placeholder="0"
                      keyboardType="numeric"
                    />
                  </Field>
                </View>
              </View>

              <View style={styles.separator} />

              <SectionHeader title="Informações de Saúde" badge="Facultativo" />
              <Field label="Alergias">
                <Input
                  value={alergias}
                  onChangeText={setAlergias}
                  placeholder="Descreva alergias conhecidas"
                />
              </Field>
              <Field label="Doenças preexistentes?">
                <Input
                  value={doencas}
                  onChangeText={setDoencas}
                  placeholder="Diabetes, hipertensão, cardiopatia..."
                />
              </Field>
              <Field label="Medicações em uso">
                <Input
                  value={medicacoes}
                  onChangeText={setMedicacoes}
                  placeholder="Medicamentos atuais"
                />
              </Field>
            </>
          )}
        </ScrollView>

        {/* Bottom button */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.nextBtn, !canAdvance() && styles.nextBtnDisabled]}
            onPress={handleNext}
            activeOpacity={0.8}
            disabled={!canAdvance()}
          >
            <Text style={styles.nextBtnText}>
              {step === LAST_STEP ? "Finalizar cadastro" : "Continuar"}
            </Text>
            <FontAwesome
              name={step === LAST_STEP ? "check" : "arrow-right"}
              size={14}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  // Header
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 56,
    paddingBottom: 18,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#fff" },
  headerStep: { fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  // Progress
  progressRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  progressDot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  progressDotActive: { backgroundColor: Colors.primary },
  // Form
  form: { flex: 1, paddingHorizontal: 20 },
  field: { marginBottom: 18 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 6,
  },
  fieldHint: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 6,
    marginTop: -4,
  },
  input: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: Colors.text,
  },
  // Section headers
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: Colors.text },
  badge: {
    backgroundColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 10, color: Colors.textSecondary },
  // Separator
  separator: { height: 1, backgroundColor: Colors.border, marginVertical: 18 },
  // Options
  optionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  optionBtnSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}08`,
  },
  optionText: { fontSize: 14, color: Colors.textSecondary },
  optionTextSelected: { color: Colors.primary, fontWeight: "600" },
  // WhatsApp toggle
  whatsappBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: Colors.card,
  },
  whatsappBtnActive: { borderColor: "#16a34a", backgroundColor: "#f0fdf4" },
  whatsappText: { fontSize: 12, color: Colors.textMuted, fontWeight: "600" },
  whatsappTextActive: { color: "#16a34a" },
  // Chips
  chipRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  chip: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}10`,
  },
  chipText: { fontSize: 12, color: Colors.textSecondary },
  chipTextSelected: { color: Colors.primary, fontWeight: "600" },
  // UBS cards
  ubsCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  ubsCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}05`,
  },
  ubsRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  ubsRadioSelected: { borderColor: Colors.primary },
  ubsRadioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  ubsName: { fontSize: 14, fontWeight: "600", color: Colors.text },
  ubsDistrito: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  // Bottom
  bottomBar: {
    padding: 20,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  nextBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  // Success
  successContainer: {
    flex: 1,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.success,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 12,
  },
  successSub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  successBtn: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
  },
  successBtnText: { fontSize: 16, fontWeight: "700", color: Colors.primary },
});
