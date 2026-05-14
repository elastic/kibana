/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills/tools';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { validateSkillDefinition } from '@kbn/agent-builder-server/skills/type_definition';
import { WORKFLOW_EXECUTE_STEP_TOOL_ID } from '@kbn/agent-builder-workflows-plugin/server';
import { createToolHandlerContext, createToolTestMocks } from '../../__mocks__/test_helpers';
import { alertAnalysisInlineApiToolSkill } from './alert_analysis_skill_inline_api_tool';
import type { FindRelatedAlertsResult } from '../../../lib/alert_analysis/services/find_related_alerts';

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
  totalMatched?: number;
  returnedCount?: number;
  isTruncated?: boolean;
}

const getData = (result: ToolHandlerStandardReturn, idx = 0): ResultData =>
  result.results[idx].data as unknown as ResultData;

const makeSuccess = (overrides: Partial<FindRelatedAlertsResult> = {}): FindRelatedAlertsResult => ({
  ok: true,
  message: 'Found 0 related alerts sharing entities with alert test-alert-id.',
  relatedAlerts: [],
  sourceEntities: { hostNames: [], userNames: [], sourceIps: [], destIps: [] },
  totalMatched: 0,
  returnedCount: 0,
  isTruncated: false,
  ...overrides,
});

describe('alertAnalysisInlineApiToolSkill', () => {
  describe('skill definition', () => {
    it('has stable skill identity', () => {
      expect(alertAnalysisInlineApiToolSkill.id).toBe('alert-analysis');
      expect(alertAnalysisInlineApiToolSkill.name).toBe('alert-analysis');
      expect(alertAnalysisInlineApiToolSkill.basePath).toBe('skills/security/alerts');
    });

    it('validates successfully', async () => {
      await expect(validateSkillDefinition(alertAnalysisInlineApiToolSkill)).resolves.toBeDefined();
    });

    it('returns 3 registry tool IDs', () => {
      const tools = alertAnalysisInlineApiToolSkill.getRegistryTools?.();
      expect(tools).toHaveLength(3);
    });

    it('does not register workflow_execute_step', () => {
      const tools = alertAnalysisInlineApiToolSkill.getRegistryTools?.();
      expect(tools).not.toContain(WORKFLOW_EXECUTE_STEP_TOOL_ID);
    });

    it('defines one inline tool with the correct id', async () => {
      const inlineTools = await alertAnalysisInlineApiToolSkill.getInlineTools?.();
      expect(inlineTools).toHaveLength(1);
      expect(inlineTools![0].id).toBe('security.alert-analysis.get-related-alerts');
    });
  });

  describe('get-related-alerts inline tool handler', () => {
    const { mockEsClient, mockRequest, mockLogger } = createToolTestMocks();

    let tool: BuiltinSkillBoundedTool;

    beforeEach(async () => {
      jest.clearAllMocks();
      const inlineTools = await alertAnalysisInlineApiToolSkill.getInlineTools?.();
      tool = inlineTools![0] as BuiltinSkillBoundedTool;
    });

    const callHandler = async (
      params: {
        alertId: string;
        timeWindowHours?: number;
        maxResults?: number;
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

    it('calls findRelatedAlerts with correct params', async () => {
      findRelatedAlerts.mockResolvedValueOnce(
        makeSuccess({
          message: 'Found 1 related alerts sharing entities with alert alert-123.',
          relatedAlerts: [{ _id: 'rel-1', _index: '.alerts-security.alerts-default' }],
          sourceEntities: { hostNames: ['host-1'], userNames: [], sourceIps: [], destIps: [] },
          totalMatched: 1,
          returnedCount: 1,
          isTruncated: false,
        })
      );

      await callHandler({ alertId: 'alert-123', timeWindowHours: 48, hostNames: ['host-1'] });

      expect(findRelatedAlerts).toHaveBeenCalledWith(
        mockEsClient.asCurrentUser,
        expect.objectContaining({
          alertId: 'alert-123',
          alertsIndex: '.alerts-security.alerts-default',
          timeWindowHours: 48,
          hostNames: ['host-1'],
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

    it('returns other result with data on success', async () => {
      findRelatedAlerts.mockResolvedValueOnce(
        makeSuccess({
          message: 'Found 2 related alerts sharing entities with alert alert-123.',
          relatedAlerts: [
            { _id: 'r1', _index: 'idx' },
            { _id: 'r2', _index: 'idx' },
          ],
          sourceEntities: { hostNames: ['h1'], userNames: [], sourceIps: [], destIps: [] },
          totalMatched: 2,
          returnedCount: 2,
        })
      );

      const result = await callHandler({ alertId: 'alert-123' });

      expect(result.results[0].type).toBe(ToolResultType.other);
      expect(getData(result).relatedAlerts).toHaveLength(2);
      expect(getData(result).totalMatched).toBe(2);
      expect(getData(result).isTruncated).toBe(false);
    });

    it('returns error result when findRelatedAlerts returns ok: false', async () => {
      findRelatedAlerts.mockResolvedValueOnce({ ok: false, message: 'Alert not found' });

      const result = await callHandler({ alertId: 'missing-alert' });

      expect(result.results[0].type).toBe(ToolResultType.error);
      expect(getData(result).message).toBe('Alert not found');
    });

    it('surfaces isTruncated when results are capped', async () => {
      findRelatedAlerts.mockResolvedValueOnce(
        makeSuccess({ totalMatched: 100, returnedCount: 25, isTruncated: true })
      );

      const result = await callHandler({ alertId: 'alert-123' });

      expect(getData(result).isTruncated).toBe(true);
      expect(getData(result).totalMatched).toBe(100);
      expect(getData(result).returnedCount).toBe(25);
    });
  });
});
