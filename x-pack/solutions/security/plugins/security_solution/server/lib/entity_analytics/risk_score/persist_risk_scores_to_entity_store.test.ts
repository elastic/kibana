/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { EntityUpdateClient } from '@kbn/entity-store/server';
import { EntityType } from '../../../../common/entity_analytics/types';
import type { EntityRiskScoreRecord } from '../../../../common/api/entity_analytics/common';
import { EntityRiskLevelsEnum } from '../../../../common/api/entity_analytics/common';
import { persistRiskScoresToEntityStore } from './persist_risk_scores_to_entity_store';

const createRiskScore = (): EntityRiskScoreRecord => ({
  '@timestamp': '2023-02-15T00:15:19.231Z',
  id_field: 'host.name',
  id_value: 'hostname',
  calculated_level: EntityRiskLevelsEnum.High,
  calculated_score: 149,
  calculated_score_norm: 85.332,
  category_1_score: 85,
  category_1_count: 12,
  category_2_count: 0,
  category_2_score: 0,
  criticality_level: 'high_impact',
  criticality_modifier: 2,
  notes: [],
  inputs: [],
});

describe('persistRiskScoresToEntityStore', () => {
  const logger = loggingSystemMock.createLogger();
  let crudClient: EntityUpdateClient;
  const scores = { [EntityType.host]: [createRiskScore()] };

  beforeEach(() => {
    crudClient = {
      bulkUpdateEntity: jest.fn().mockResolvedValue([]),
    } as unknown as EntityUpdateClient;
  });

  it('leaves the refresh to the entity store default unless asked otherwise', async () => {
    await persistRiskScoresToEntityStore({ crudClient, logger, scores });

    expect(jest.mocked(crudClient.bulkUpdateEntity).mock.calls[0][0].refresh).toBeUndefined();
  });

  it('forwards the refresh option', async () => {
    await persistRiskScoresToEntityStore({ crudClient, logger, scores, refresh: false });

    expect(crudClient.bulkUpdateEntity).toHaveBeenCalledWith(
      expect.objectContaining({ refresh: false })
    );
  });
});
