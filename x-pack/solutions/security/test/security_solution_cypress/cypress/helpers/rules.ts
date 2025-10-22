/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import dateMath from '@kbn/datemath';
import moment from 'moment';
import type { PrebuiltRuleAsset } from '@kbn/security-solution-plugin/server/lib/detection_engine/prebuilt_rules';
import { getPrebuiltRuleMock } from '@kbn/security-solution-plugin/server/lib/detection_engine/prebuilt_rules/mocks';

import type { ThreatArray } from '@kbn/security-solution-plugin/common/api/detection_engine';

export const formatMitreAttackDescription = (mitre: ThreatArray) => {
  return mitre
    .map(
      (threat) =>
        `${threat.tactic.name} (${threat.tactic.id})${
          threat.technique
            ? threat.technique
                .map((technique) => {
                  return `${technique.name} (${technique.id})${
                    technique.subtechnique
                      ? technique.subtechnique
                          .map((subtechnique) => `${subtechnique.name} (${subtechnique.id})`)
                          .join('')
                      : ''
                  }`;
                })
                .join('')
            : ''
        }`
    )
    .join('');
};

export const elementsOverlap = ($element1: JQuery<HTMLElement>, $element2: JQuery<HTMLElement>) => {
  const rectA = $element1[0].getBoundingClientRect();
  const rectB = $element2[0].getBoundingClientRect();

  // If they don't overlap horizontally, they don't overlap
  if (rectA.right < rectB.left || rectB.right < rectA.left) {
    return false;
  } else if (rectA.bottom < rectB.top || rectB.bottom < rectA.top) {
    // If they don't overlap vertically, they don't overlap
    return false;
  } else {
    return true;
  }
};

export const getHumanizedDuration = (from: string, interval: string): string => {
  const fromValue = dateMath.parse(from) ?? moment();
  const intervalValue = dateMath.parse(`now-${interval}`) ?? moment();

  const fromDuration = moment.duration(intervalValue.diff(fromValue));

  // Basing calculations off floored seconds count as moment durations weren't precise
  const intervalDuration = Math.floor(fromDuration.asSeconds());
  // For consistency of display value
  if (intervalDuration === 0) {
    return `0s`;
  }

  if (intervalDuration % 3600 === 0) {
    return `${intervalDuration / 3600}h`;
  } else if (intervalDuration % 60 === 0) {
    return `${intervalDuration / 60}m`;
  } else {
    return `${intervalDuration}s`;
  }
};

export const convertHistoryStartToSize = (relativeTime: string) => {
  if (relativeTime.startsWith('now-')) {
    return relativeTime.substring(4);
  } else {
    return relativeTime;
  }
};

/**
 * A helper function to create a rule asset saved object (type: security-rule)
 *
 * @param overrideParams Params to override the default mock
 * @returns Created rule asset saved object
 */
export const createRuleAssetSavedObject = (overrideParams: Partial<PrebuiltRuleAsset>) => ({
  'security-rule': {
    ...getPrebuiltRuleMock(),
    ...overrideParams,
  },
  type: 'security-rule',
  references: [],
  coreMigrationVersion: '8.6.0',
  updated_at: '2022-11-01T12:56:39.717Z',
  created_at: '2022-11-01T12:56:39.717Z',
});
