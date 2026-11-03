/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MITRE_ATTACK_FRAMEWORK } from '../../../../../../common/detection_engine/mitre/iterate_mitre_threat_entities';

interface RuleThreat {
  framework?: string;
  tactic?: { name: string };
}

/** Returns true if any ATT&CK threat of the rule has a tactic matching the given predicate. */
export const ruleCoversAttackTactic = (
  threats: RuleThreat[] | undefined,
  matchesTactic: (normalizedTacticName: string) => boolean
): boolean =>
  Boolean(
    threats?.some((threat) => {
      if (threat.framework && threat.framework !== MITRE_ATTACK_FRAMEWORK) {
        return false;
      }
      const name = threat.tactic?.name?.trim().toLowerCase();
      return name ? matchesTactic(name) : false;
    })
  );
