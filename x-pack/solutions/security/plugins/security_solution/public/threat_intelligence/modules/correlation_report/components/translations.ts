/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

const ns = 'xpack.securitySolution.threatIntelligence.correlationReport';

export const i18nText = {
  defaultTitle: () =>
    i18n.translate(`${ns}.defaultTitle`, { defaultMessage: 'Correlation Report' }),

  runIdLabel: () => i18n.translate(`${ns}.runIdLabel`, { defaultMessage: 'Run' }),

  blufSectionTitle: () =>
    i18n.translate(`${ns}.blufSectionTitle`, { defaultMessage: 'Bottom Line Up Front' }),

  caseSignalSectionTitle: () =>
    i18n.translate(`${ns}.caseSignalSectionTitle`, { defaultMessage: 'Case Signal' }),

  caseSignalDescription: () =>
    i18n.translate(`${ns}.caseSignalDescription`, {
      defaultMessage: 'Diamond signal of the case under analysis.',
    }),

  leadsSectionTitle: () => i18n.translate(`${ns}.leadsSectionTitle`, { defaultMessage: 'Leads' }),

  noMatchesSectionTitle: () =>
    i18n.translate(`${ns}.noMatchesSectionTitle`, { defaultMessage: 'No Matches' }),

  noMatchesEmpty: () =>
    i18n.translate(`${ns}.noMatchesEmpty`, { defaultMessage: 'None this run.' }),

  synthesisSectionTitle: () =>
    i18n.translate(`${ns}.synthesisSectionTitle`, { defaultMessage: 'Synthesis' }),

  nextStepsSectionTitle: () =>
    i18n.translate(`${ns}.nextStepsSectionTitle`, { defaultMessage: 'Next Steps' }),

  // Vertex labels
  vertexAdversary: () => i18n.translate(`${ns}.vertexAdversary`, { defaultMessage: 'Adversary' }),
  vertexCapability: () =>
    i18n.translate(`${ns}.vertexCapability`, { defaultMessage: 'Capability' }),
  vertexInfrastructure: () =>
    i18n.translate(`${ns}.vertexInfrastructure`, { defaultMessage: 'Infrastructure' }),
  vertexVictim: () => i18n.translate(`${ns}.vertexVictim`, { defaultMessage: 'Victim' }),

  // Signal level labels
  signalHigh: () => i18n.translate(`${ns}.signalHigh`, { defaultMessage: 'high' }),
  signalModerate: () => i18n.translate(`${ns}.signalModerate`, { defaultMessage: 'moderate' }),
  signalPartial: () => i18n.translate(`${ns}.signalPartial`, { defaultMessage: 'partial' }),
  signalLow: () => i18n.translate(`${ns}.signalLow`, { defaultMessage: 'low' }),
  signalNone: () => i18n.translate(`${ns}.signalNone`, { defaultMessage: 'none' }),

  // Relationship labels
  relationshipSameCampaign: () =>
    i18n.translate(`${ns}.relationshipSameCampaign`, { defaultMessage: 'Same Campaign' }),
  relationshipSameActor: () =>
    i18n.translate(`${ns}.relationshipSameActor`, { defaultMessage: 'Same Actor' }),
  relationshipSharedTradecraft: () =>
    i18n.translate(`${ns}.relationshipSharedTradecraft`, { defaultMessage: 'Shared Tradecraft' }),

  // Evidence weight labels
  weightSmokingGun: () =>
    i18n.translate(`${ns}.weightSmokingGun`, { defaultMessage: 'smoking gun' }),
  weightSupporting: () =>
    i18n.translate(`${ns}.weightSupporting`, { defaultMessage: 'supporting' }),
  weightNonDiscriminatory: () =>
    i18n.translate(`${ns}.weightNonDiscriminatory`, { defaultMessage: 'non-discriminatory' }),
  weightCounter: () => i18n.translate(`${ns}.weightCounter`, { defaultMessage: 'counter' }),
  weightDecisiveCounter: () =>
    i18n.translate(`${ns}.weightDecisiveCounter`, { defaultMessage: 'decisive counter' }),

  // Evidence section labels
  supportingEvidenceLabel: () =>
    i18n.translate(`${ns}.supportingEvidenceLabel`, { defaultMessage: 'Supporting' }),
  counterEvidenceLabel: () =>
    i18n.translate(`${ns}.counterEvidenceLabel`, { defaultMessage: 'Counter' }),
  gapsLabel: () => i18n.translate(`${ns}.gapsLabel`, { defaultMessage: 'Gaps' }),

  // Synthesis fields
  reasoningLabel: () => i18n.translate(`${ns}.reasoningLabel`, { defaultMessage: 'Reasoning' }),
  synthesisGapsLabel: () => i18n.translate(`${ns}.synthesisGapsLabel`, { defaultMessage: 'Gaps' }),
  inferentialHopsLabel: () =>
    i18n.translate(`${ns}.inferentialHopsLabel`, { defaultMessage: 'Inferential hops' }),
  atomicIocOverlapLabel: () =>
    i18n.translate(`${ns}.atomicIocOverlapLabel`, { defaultMessage: 'Atomic IOC overlap' }),
  atomicIocAssessed: () =>
    i18n.translate(`${ns}.atomicIocAssessed`, { defaultMessage: 'assessed' }),
  atomicIocNotAssessed: () =>
    i18n.translate(`${ns}.atomicIocNotAssessed`, { defaultMessage: 'not assessed' }),

  // Lead card
  sourceLabel: () => i18n.translate(`${ns}.sourceLabel`, { defaultMessage: 'Source' }),
  sourcesLabel: () => i18n.translate(`${ns}.sourcesLabel`, { defaultMessage: 'Sources' }),
  diamondLabel: () =>
    i18n.translate(`${ns}.diamondLabel`, { defaultMessage: 'Diamond model vertex signals' }),

  // Misc
  notAssessed: () => i18n.translate(`${ns}.notAssessed`, { defaultMessage: 'not assessed' }),
  consolidatedReportsLabel: () =>
    i18n.translate(`${ns}.consolidatedReportsLabel`, {
      defaultMessage: 'Consolidated Reports',
    }),
};
