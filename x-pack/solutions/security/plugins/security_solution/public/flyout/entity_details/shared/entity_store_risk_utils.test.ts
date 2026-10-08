/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RiskSeverity } from '../../../../common/search_strategy';
import type { EntityStoreRecord } from './hooks/use_entity_from_store';
import { getHeaderRiskLevel, getResolutionRiskFromEntityRecord } from './entity_store_risk_utils';

const recordWithBothScores = {
  entity: {
    risk: { calculated_level: RiskSeverity.Low, calculated_score_norm: 12 },
    relationships: {
      resolution: {
        risk: { calculated_level: RiskSeverity.Critical, calculated_score_norm: 91 },
      },
    },
  },
} as EntityStoreRecord;

describe('getHeaderRiskLevel', () => {
  it('uses the individual level when the facelift preference is off', () => {
    expect(getHeaderRiskLevel(recordWithBothScores, false)).toBe(RiskSeverity.Low);
  });

  it('uses the resolution-group level when the facelift preference is on and a group score exists', () => {
    expect(getHeaderRiskLevel(recordWithBothScores, true)).toBe(RiskSeverity.Critical);
  });

  it('keeps the individual level when the facelift is on but the record has no resolution score', () => {
    const record = {
      entity: { risk: { calculated_level: RiskSeverity.High, calculated_score_norm: 70 } },
    } as EntityStoreRecord;

    expect(getResolutionRiskFromEntityRecord(record)).toBeNull();
    expect(getHeaderRiskLevel(record, true)).toBe(RiskSeverity.High);
  });

  it('returns undefined when there is no entity record', () => {
    expect(getHeaderRiskLevel(undefined, true)).toBeUndefined();
  });
});
