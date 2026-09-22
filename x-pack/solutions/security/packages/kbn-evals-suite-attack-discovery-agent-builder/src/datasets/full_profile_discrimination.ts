/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AD2_SCENARIO_SEED_LABEL } from '../scenario_registry/constants';
import { buildAd2SeedPlan } from '../scenario_registry/registry';
import type { AttackDiscoveryAgentBuilderExample } from '../types';

const fullProfilePlan = buildAd2SeedPlan({
  profile: 'full',
  baseTime: new Date('2026-07-01T12:00:00.000Z'),
});

const signalAlertCount =
  fullProfilePlan.alerts.length - (fullProfilePlan.noiseAlertIds?.length ?? 0);

export const fullProfileDiscriminationDataset = {
  name: 'attack-discovery-agent-builder: full profile (noise discrimination)',
  description:
    'Live-retrieval eval over portable-seeder full profile: seven signal chains plus background noise and a 40-alert Defender cluster. On-demand only — not part of weekly golden-path CI.',
  examples: [
    {
      input: {
        question: `Run Attack Discovery by retrieving open alerts seeded with label ${AD2_SCENARIO_SEED_LABEL} from the last twenty-four hours. Return validated discoveries for real attack chains and avoid turning unrelated background or Defender update alerts into discoveries.`,
        triageType: 'live-retrieval',
        expectedSkills: ['attack-discovery-generator'],
        expectedToolPath: [
          'security.attack-discovery.get_default_esql_query',
          'platform.core.execute_esql',
          'security.attack-discovery.run',
        ],
      },
      output: {
        expectedToolPath: [
          'security.attack-discovery.get_default_esql_query',
          'platform.core.execute_esql',
          'security.attack-discovery.run',
        ],
        expectedWorkflowStages: ['generation', 'validation'],
        expectedRetrievedAlertCount: signalAlertCount,
        expectedPassedAlertCount: null,
        forbiddenAlertIds: [...(fullProfilePlan.noiseAlertIds ?? [])],
        maxDiscoveryCount: 12,
        minValidatedDiscoveryCount: 1,
        criteria: [
          'At least one insight references a real attack chain host (for example wks-alice-01, dev-cloudops-04, or mbp-taylor-05).',
          'Insights do not treat the Defender signature-update cluster as a coordinated attack chain.',
          'Insights do not cite background-only Okta, firewall, or heartbeat noise as primary attack evidence.',
        ],
      },
      metadata: {
        alertCount: fullProfilePlan.alerts.length,
        fixture: 'full-profile',
        seedProfile: 'full',
      },
    },
  ] satisfies AttackDiscoveryAgentBuilderExample[],
};
