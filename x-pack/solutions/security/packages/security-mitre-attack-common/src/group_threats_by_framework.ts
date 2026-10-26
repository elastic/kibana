/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_MITRE_FRAMEWORK } from './constants';
import type { MitreFramework } from './schema';
import { MITRE_FRAMEWORKS } from './schema';
import { THREAT_FRAMEWORK_NAME, getMitreFrameworkByThreatName } from './threat_framework';

export interface ThreatFrameworkGroup<T> {
  /** Known framework, or undefined when `framework` string is not recognized. */
  framework: MitreFramework | undefined;
  /** Display label: THREAT_FRAMEWORK_NAME[framework] for known frameworks, the raw string otherwise. */
  label: string;
  /** Threats of this framework, as the same object references as the input, in input order. */
  threats: T[];
}

/**
 * Groups threats by framework: known frameworks first in `MITRE_FRAMEWORKS` order,
 * then unrecognized framework strings in first-seen order. Null holes are skipped.
 * A missing or blank `framework` counts as the default framework (MITRE ATT&CK), matching
 * how the form serializers default it on save.
 */
export const groupThreatsByFramework = <T extends { framework?: string }>(
  threats: readonly T[] | undefined | null
): Array<ThreatFrameworkGroup<T>> => {
  if (!threats || threats.length === 0) {
    return [];
  }

  const knownGroups = new Map<MitreFramework, T[]>();
  const unknownGroups = new Map<string, T[]>();

  for (const threat of threats) {
    if (threat != null) {
      const rawFramework = threat.framework?.trim() ? threat.framework : undefined;
      const framework =
        rawFramework === undefined
          ? DEFAULT_MITRE_FRAMEWORK
          : getMitreFrameworkByThreatName(rawFramework);
      if (framework !== undefined) {
        knownGroups.set(framework, [...(knownGroups.get(framework) ?? []), threat]);
      } else {
        const label = threat.framework ?? '';
        unknownGroups.set(label, [...(unknownGroups.get(label) ?? []), threat]);
      }
    }
  }

  const groups: Array<ThreatFrameworkGroup<T>> = [];
  for (const framework of MITRE_FRAMEWORKS) {
    const frameworkThreats = knownGroups.get(framework);
    if (frameworkThreats) {
      groups.push({
        framework,
        label: THREAT_FRAMEWORK_NAME[framework],
        threats: frameworkThreats,
      });
    }
  }
  for (const [label, labelThreats] of unknownGroups) {
    groups.push({ framework: undefined, label, threats: labelThreats });
  }
  return groups;
};
