/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills/tools';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { createToolHandlerContext, createToolTestMocks } from '../../__mocks__/test_helpers';
import { alertAnalysisSkill } from './alert_analysis_skill';
import type {
  FindRelatedAlertsResult,
  FindRelatedAlertsSuccess,
} from '../../../lib/alert_analysis/services/find_related_alerts';
import { RELATED_ALERTS_INLINE_MAX_RESULTS } from '../../../lib/alert_analysis/services/find_related_alerts';

jest.mock('../../../lib/alert_analysis/services/find_related_alerts');

const { findRelatedAlerts } = jest.requireMock(
  '../../../lib/alert_analysis/services/find_related_alerts'
) as { findRelatedAlerts: jest.MockedFunction<() => Promise<FindRelatedAlertsResult>> };

interface ResultData {
  message?: string;
  relatedAlerts?: Array<Record<string, unknown>>;
  sourceEntities?: {
    hostNames: string[];
    userNames: string[];
    sourceIps: string[];
    destIps: string[];
  };
}

const getData = (result: ToolHandlerStandardReturn, idx = 0): ResultData =>
  result.results[idx].data as unknown as ResultData;

const makeSuccess = (
  overrides: Partial<Omit<FindRelatedAlertsSuccess, 'ok'>> = {}
): FindRelatedAlertsSuccess => ({
  ok: true,
  message: 'Found 0 related alerts sharing entities with alert test-alert-id.',
  relatedAlerts: [],
  sourceEntities: { hostNames: [], userNames: [], sourceIps: [], destIps: [] },
  totalMatched: 0,
  returnedCount: 0,
  isTruncated: false,
  ...overrides,
});

describe('alertAnalysisSkill', () => {
  describe('get-related-alerts inline tool', () => {
    it('schema exposes alertId, timeWindowHours, and optional entity shortcut params', async () => {
      const inlineTools = await alertAnalysisSkill.getInlineTools?.();
      const tool = inlineTools![0] as BuiltinSkillBoundedTool;
      const shape = (tool.schema as { shape?: Record<string, unknown> }).shape ?? {};
      expect(Object.keys(shape)).toEqual([
        'alertId',
        'timeWindowHours',
        'hostNames',
        'userNames',
        'sourceIps',
        'destIps',
      ]);
    });

    describe('handler', () => {
      const { mockEsClient, mockRequest, mockLogger } = createToolTestMocks();

      let tool: BuiltinSkillBoundedTool;

      beforeEach(async () => {
        jest.clearAllMocks();
        const inlineTools = await alertAnalysisSkill.getInlineTools?.();
        tool = inlineTools![0] as BuiltinSkillBoundedTool;
      });

      const callHandler = async (
        params: {
          alertId: string;
          timeWindowHours?: number;
          hostNames?: string[];
          userNames?: string[];
          sourceIps?: string[];
          destIps?: string[];
        },
        spaceId = 'default'
      ) => {
        return tool.handler(
          params,
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger, { spaceId })
        ) as Promise<ToolHandlerStandardReturn>;
      };

      it('calls findRelatedAlerts with alertId, alertsIndex, timeWindowHours, and inline maxResults', async () => {
        findRelatedAlerts.mockResolvedValueOnce(
          makeSuccess({
            message: 'Found 1 related alerts sharing entities with alert alert-123.',
            relatedAlerts: [{ _id: 'rel-1', _index: '.alerts-security.alerts-default' }],
            sourceEntities: { hostNames: ['host-1'], userNames: [], sourceIps: [], destIps: [] },
          })
        );

        await callHandler({ alertId: 'alert-123', timeWindowHours: 48 });

        expect(findRelatedAlerts).toHaveBeenCalledWith(
          mockEsClient.asCurrentUser,
          expect.objectContaining({
            alertId: 'alert-123',
            alertsIndex: '.alerts-security.alerts-default',
            timeWindowHours: 48,
            maxResults: RELATED_ALERTS_INLINE_MAX_RESULTS,
          })
        );
      });

      it('passes entity shortcut params through to findRelatedAlerts when provided', async () => {
        findRelatedAlerts.mockResolvedValueOnce(makeSuccess());

        await callHandler({ alertId: 'alert-123', hostNames: ['host-1'], userNames: ['user-1'] });

        expect(findRelatedAlerts).toHaveBeenCalledWith(
          mockEsClient.asCurrentUser,
          expect.objectContaining({
            hostNames: ['host-1'],
            userNames: ['user-1'],
          })
        );
      });

      it('uses the correct space-scoped alerts index', async () => {
        findRelatedAlerts.mockResolvedValueOnce(makeSuccess());

        await callHandler({ alertId: 'alert-abc' }, 'prod');

        expect(findRelatedAlerts).toHaveBeenCalledWith(
          mockEsClient.asCurrentUser,
          expect.objectContaining({
            alertsIndex: '.alerts-security.alerts-prod',
          })
        );
      });

      it('returns message with truncation hint when findRelatedAlerts result is truncated', async () => {
        findRelatedAlerts.mockResolvedValueOnce(
          makeSuccess({
            message: 'Found 1 of 99 related alerts sharing entities with alert alert-123.',
            relatedAlerts: [{ _id: 'r1', _index: 'idx' }],
            totalMatched: 99,
            returnedCount: 1,
            isTruncated: true,
          })
        );

        const result = await callHandler({ alertId: 'alert-123' });

        expect(getData(result).message).toBe(
          'Found 1 of 99 related alerts sharing entities with alert alert-123.'
        );
      });

      it('returns message, sourceEntities, and relatedAlerts only — no surplus metadata', async () => {
        findRelatedAlerts.mockResolvedValueOnce(
          makeSuccess({
            message: 'Found 2 related alerts sharing entities with alert alert-123.',
            relatedAlerts: [
              { _id: 'r1', _index: 'idx' },
              { _id: 'r2', _index: 'idx' },
            ],
            sourceEntities: { hostNames: ['h1'], userNames: [], sourceIps: [], destIps: [] },
          })
        );

        const result = await callHandler({ alertId: 'alert-123' });

        expect(result.results[0].type).toBe(ToolResultType.other);
        expect(getData(result).relatedAlerts).toHaveLength(2);
        expect(getData(result).sourceEntities?.hostNames).toEqual(['h1']);
        expect(getData(result)).not.toHaveProperty('totalMatched');
        expect(getData(result)).not.toHaveProperty('returnedCount');
        expect(getData(result)).not.toHaveProperty('isTruncated');
      });

      it('returns error result when findRelatedAlerts returns ok: false', async () => {
        findRelatedAlerts.mockResolvedValueOnce({
          ok: false,
          reason: 'alert_not_found',
          message: 'Alert not found',
        });

        const result = await callHandler({ alertId: 'missing-alert' });

        expect(result.results[0].type).toBe(ToolResultType.error);
        expect(getData(result).message).toBe('Alert not found');
      });
    });
  });
});
