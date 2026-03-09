import { Badge } from "@/components/ui/badge";
import type { RiscoGestacional } from "@mae-salvador/shared";

const RISK_CONFIG: Record<RiscoGestacional, { label: string; className: string }> = {
  habitual: {
    label: "Risco Habitual",
    className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200",
  },
  alto: {
    label: "Alto Risco",
    className: "bg-red-100 text-red-800 hover:bg-red-100 border-red-200",
  },
};

export function RiskBadge({ risco }: { risco: RiscoGestacional }) {
  const config = RISK_CONFIG[risco];
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
