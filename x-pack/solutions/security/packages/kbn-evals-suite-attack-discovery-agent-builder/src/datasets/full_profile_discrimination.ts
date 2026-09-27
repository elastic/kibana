/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildAd2SeedPlan } from '../scenario_registry/registry';
import type { AttackDiscoveryAgentBuilderExample } from '../types';

const FULL_PROFILE_BASE_TIME = new Date('2026-07-01T12:00:00.000Z');

export const buildFullProfileDiscriminationDataset = (runMarker: string) => {
  const fullProfilePlan = buildAd2SeedPlan({
    profile: 'full',
    baseTime: FULL_PROFILE_BASE_TIME,
    runMarker,
  });

  return {
    name: `attack-discovery-agent-builder: full profile (noise discrimination) [${runMarker}]`,
    description:
      'Live-retrieval eval over portable-seeder full profile: seven signal chains plus background noise and a 40-alert Defender cluster. On-demand only — not part of weekly golden-path CI.',
    examples: [
      {
        input: {
          // The seed label is generation-wide: every concurrent scenario-registry
          // run in the shared alerts index carries it. The run marker is the only
          // bound that separates this run's 178-alert population from every other
          // one (the dense live-retrieval example scopes the same way), so the
          // question asks for it AND the example declares it as `retrievalScope`
          // — otherwise `evaluate_dataset` credits an unscoped row count as this
          // fixture's retrieval.
          question: `Run Attack Discovery by retrieving open alerts with the marker ${runMarker} from the last twenty-four hours. Return validated discoveries for real attack chains and avoid turning unrelated background or Defender update alerts into discoveries.`,
          retrievalScope: runMarker,
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
          // The FULL seeded population (28 signal + 150 noise): the live
          // retrieval query is not filtered to signal alerts, so a correct
          // 178-row retrieval must pass, not fail. The noise IDs below are the
          // forbidden set for generated discoveries, not alerts that should
          // vanish from retrieval.
          expectedRetrievedAlertCount: fullProfilePlan.alerts.length,
          // Deliberately ABSENT (not `null`): the evaluator contract reads
          // `null` as "assert the run reports null" — an unwinnable assertion
          // on any run that passes alerts. Omitting the key leaves the passed
          // count unscored, the same choice the dense profile makes.
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
};
