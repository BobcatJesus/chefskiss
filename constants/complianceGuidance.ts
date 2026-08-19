export type ComplianceJurisdiction = 'TX' | 'CA' | 'NY' | 'FL' | 'OTHER';

export type ComplianceCookType =
  | 'home_kitchen'
  | 'commercial_kitchen'
  | 'in_home_personal_chef';

export type ComplianceSuggestion = {
  id: string;
  title: string;
  detail: string;
  severity: 'required' | 'recommended';
};

type GuidanceInput = {
  jurisdiction: ComplianceJurisdiction;
  cookTypes: ComplianceCookType[];
};

const BASE_SUGGESTIONS: ComplianceSuggestion[] = [
  {
    id: 'permit-proof',
    title: 'Upload valid food handler credential',
    detail: 'Keep the permit image/PDF readable and include the expiration date in your profile.',
    severity: 'required',
  },
  {
    id: 'labeling-basics',
    title: 'Use compliant labels for packaged items',
    detail: 'Include product name, major allergens, and producer contact details on each package.',
    severity: 'required',
  },
  {
    id: 'sanitation-log',
    title: 'Maintain kitchen sanitation records',
    detail: 'Keep cleaning logs, temperature checks, and ingredient traceability notes for safety disputes.',
    severity: 'required',
  },
  {
    id: 'local-check',
    title: 'Confirm city and county rules',
    detail: 'Municipal or county rules can be stricter than state rules, especially for home kitchens.',
    severity: 'recommended',
  },
];

const HOME_KITCHEN_SUGGESTIONS: ComplianceSuggestion[] = [
  {
    id: 'home-allowed-foods',
    title: 'Verify your products are allowed under cottage rules',
    detail: 'Some states restrict potentially hazardous foods from home-kitchen sales.',
    severity: 'required',
  },
  {
    id: 'home-sales-limits',
    title: 'Track annual sales caps and channel limits',
    detail: 'Many cottage frameworks limit yearly revenue or where products can be sold.',
    severity: 'recommended',
  },
];

const COMMERCIAL_KITCHEN_SUGGESTIONS: ComplianceSuggestion[] = [
  {
    id: 'commercial-docs',
    title: 'Keep commercial kitchen documentation',
    detail: 'Store lease/usage agreement and latest inspection documentation for verification checks.',
    severity: 'required',
  },
];

const PERSONAL_CHEF_SUGGESTIONS: ComplianceSuggestion[] = [
  {
    id: 'inhome-consent',
    title: 'Document in-home service safety terms',
    detail: 'Use written client consent for kitchen access, food handling scope, and cleanup expectations.',
    severity: 'recommended',
  },
];

const STATE_SUGGESTIONS: Record<ComplianceJurisdiction, ComplianceSuggestion[]> = {
  TX: [
    {
      id: 'tx-label',
      title: 'Texas cottage label statement',
      detail: 'Include the required Texas cottage-food disclosure statement on labels.',
      severity: 'required',
    },
  ],
  CA: [
    {
      id: 'ca-registration',
      title: 'California local registration/permit',
      detail: 'Check Class A or Class B permit expectations with your local environmental health office.',
      severity: 'required',
    },
  ],
  NY: [
    {
      id: 'ny-home-processing',
      title: 'New York home processing requirements',
      detail: 'Confirm whether your product category requires registration or process review.',
      severity: 'required',
    },
  ],
  FL: [
    {
      id: 'fl-disclosure',
      title: 'Florida cottage disclosure language',
      detail: 'Use the required Florida cottage-food statement on labels where applicable.',
      severity: 'required',
    },
  ],
  OTHER: [
    {
      id: 'other-health-dept',
      title: 'Contact your local health department',
      detail: 'Use your city/county health office as source-of-truth before listing food for sale.',
      severity: 'required',
    },
  ],
};

export function buildComplianceSuggestions(input: GuidanceInput): ComplianceSuggestion[] {
  const suggestions: ComplianceSuggestion[] = [...BASE_SUGGESTIONS, ...STATE_SUGGESTIONS[input.jurisdiction]];

  if (input.cookTypes.includes('home_kitchen')) {
    suggestions.push(...HOME_KITCHEN_SUGGESTIONS);
  }

  if (input.cookTypes.includes('commercial_kitchen')) {
    suggestions.push(...COMMERCIAL_KITCHEN_SUGGESTIONS);
  }

  if (input.cookTypes.includes('in_home_personal_chef')) {
    suggestions.push(...PERSONAL_CHEF_SUGGESTIONS);
  }

  const seen = new Set<string>();
  return suggestions.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}
