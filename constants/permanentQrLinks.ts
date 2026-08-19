export type PermanentQrCampaign = {
  target: string;
  label: string;
};

export const permanentQrCampaigns: Record<string, PermanentQrCampaign> = {
  app: {
    target: '/(customer)/discover',
    label: 'Primary app entry point',
  },
  discover: {
    target: '/(customer)/discover',
    label: 'Discover feed direct entry',
  },
  cooks: {
    target: '/cooks',
    label: 'Cook listing entry',
  },
  signup: {
    target: '/(auth)/sign-up',
    label: 'Signup campaign',
  },
  becomeacook: {
    target: '/onboarding/become-cook',
    label: 'Cook onboarding campaign',
  },
  flyer: {
    target: '/(customer)/discover',
    label: 'Printed flyer campaign',
  },
  event: {
    target: '/(customer)/discover',
    label: 'In-person event campaign',
  },
  menu: {
    target: '/(customer)/discover',
    label: 'Menu handout campaign',
  },
};

export function resolvePermanentQrTarget(inputCode: string) {
  const normalizedCode = inputCode.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  if (!normalizedCode) {
    return null;
  }

  const campaign = permanentQrCampaigns[normalizedCode];
  return campaign?.target ?? null;
}
