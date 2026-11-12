/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { EntityUpdateClient } from '@kbn/entity-store/server';
import { EntityType } from '../../../../common/entity_analytics/types';
import { persistRiskScoresToEntityStore } from './persist_risk_scores_to_entity_store';
import { riskScoreServiceMock } from './risk_score_service.mock';

describe('persistRiskScoresToEntityStore', () => {
  const logger = loggingSystemMock.createLogger();
  let crudClient: EntityUpdateClient;
  const scores = { [EntityType.host]: [riskScoreServiceMock.createRiskScore()] };

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
