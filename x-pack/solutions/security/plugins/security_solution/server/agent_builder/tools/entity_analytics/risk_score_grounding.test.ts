/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { ToolResultType } from '@kbn/agent-builder-common';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { EntityStoreStartContract } from '@kbn/entity-store/server';
import { fetchRiskScoreGrounding } from './risk_score_grounding';

describe('risk_score_grounding', () => {
  const logger = loggingSystemMock.createLogger();
  const getMaintainerStatus = jest.fn();
  const entityStore = { getMaintainerStatus } as unknown as EntityStoreStartContract;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchRiskScoreGrounding', () => {
    it('returns started when the risk-score maintainer task is started', async () => {
      getMaintainerStatus.mockResolvedValueOnce([{ id: 'risk-score', taskStatus: 'started' }]);

      const result = await fetchRiskScoreGrounding({
        entityStore,
        namespace: 'default',
        logger,
      });

      expect(result!.type).toBe(ToolResultType.other);
      expect(result!.tool_result_id).toEqual(expect.any(String));
      expect(result!.data).toEqual({ riskScoreGrounding: { status: 'started' } });
      expect(getMaintainerStatus).toHaveBeenCalledWith('default', ['risk-score']);
    });

    it('returns stopped with the maintainer last-success time-ago when the task is stopped', async () => {
      const lastSuccessTimestamp = moment().subtract(3, 'hours').toISOString();
      getMaintainerStatus.mockResolvedValueOnce([
        {
          id: 'risk-score',
          taskStatus: 'stopped',
          lastSuccessTimestamp,
        },
      ]);

      const result = await fetchRiskScoreGrounding({
        entityStore,
        namespace: 'default',
        logger,
      });

      expect(result!.data).toEqual({
        riskScoreGrounding: {
          status: 'stopped',
          lastScoreTimeAgo: moment(lastSuccessTimestamp).fromNow(),
        },
      });
    });

    it('returns stopped without a timestamp when the maintainer has never successfully run', async () => {
      getMaintainerStatus.mockResolvedValueOnce([{ id: 'risk-score', taskStatus: 'stopped' }]);

      const result = await fetchRiskScoreGrounding({
        entityStore,
        namespace: 'default',
        logger,
      });

      expect(result!.data).toEqual({ riskScoreGrounding: { status: 'stopped' } });
    });

    it('returns never_started when the maintainer task has never started', async () => {
      getMaintainerStatus.mockResolvedValueOnce([
        { id: 'risk-score', taskStatus: 'never_started' },
      ]);

      const result = await fetchRiskScoreGrounding({
        entityStore,
        namespace: 'default',
        logger,
      });

      expect(result!.data).toEqual({ riskScoreGrounding: { status: 'never_started' } });
    });

    it('returns never_started when no matching maintainer entry is returned', async () => {
      getMaintainerStatus.mockResolvedValueOnce([]);

      const result = await fetchRiskScoreGrounding({
        entityStore,
        namespace: 'default',
        logger,
      });

      expect(result!.data).toEqual({ riskScoreGrounding: { status: 'never_started' } });
    });

    it('returns undefined when the maintainer status lookup throws', async () => {
      getMaintainerStatus.mockRejectedValueOnce(new Error('boom'));

      const result = await fetchRiskScoreGrounding({
        entityStore,
        namespace: 'default',
        logger,
      });

      expect(result).toBeUndefined();
    });
  });
});
