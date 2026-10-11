/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Threats } from '@kbn/securitysolution-io-ts-alerting-types';
import type { MitreFramework } from '@kbn/security-mitre-attack-common';
import {
  THREAT_FRAMEWORK_NAME,
  getMitreFrameworkByThreatName,
} from '@kbn/security-mitre-attack-common';

export const MITRE_ATTACK_FRAMEWORK = THREAT_FRAMEWORK_NAME.enterprise;
export const MITRE_ATLAS_FRAMEWORK = THREAT_FRAMEWORK_NAME.atlas;

export type MitreThreatEntityType = 'tactic' | 'technique' | 'subtechnique';

export interface MitreThreatEntity {
  type: MitreThreatEntityType;
  id: string;
  framework: MitreFramework;
}

/**
 * Walks a rule's `threat` array and yields one `MitreThreatEntity` per
 * tactic, technique, and subtechnique entry found under a managed MITRE
 * framework (ATT&CK Enterprise or ATLAS). Each entity carries the resolved
 * `framework` of its parent threat item. Threat entries whose `framework`
 * string is not recognized are skipped.
 *
 * Order is depth-first within each threat item:
 *   tactic, technique[0], technique[0].subtechnique[0..n], technique[1], ...
 *
 * The iterator does not dedupe — callers that need uniqueness should
 * collect into a `Set`.
 */
export function* iterateMitreThreatEntities(
  threats: Threats | undefined
): IterableIterator<MitreThreatEntity> {
  if (!threats || threats.length === 0) {
    return;
  }

  for (const threatItem of threats) {
    const framework = getMitreFrameworkByThreatName(threatItem.framework);
    if (framework !== undefined) {
      yield { type: 'tactic', id: threatItem.tactic.id, framework };

      for (const technique of threatItem.technique ?? []) {
        yield { type: 'technique', id: technique.id, framework };

        for (const subtechnique of technique.subtechnique ?? []) {
          yield { type: 'subtechnique', id: subtechnique.id, framework };
        }
      }
    }
  }
}
