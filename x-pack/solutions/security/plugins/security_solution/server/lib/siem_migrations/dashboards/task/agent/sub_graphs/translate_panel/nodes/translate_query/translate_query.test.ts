/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTranslateQueryNode } from './translate_query';
import { formatResourceWithSampledValues } from '@kbn/agent-builder-genai-utils';
import { MISSING_INDEX_PATTERN_PLACEHOLDER } from '../../../../../../../common/constants';
import { TRANSLATION_INDEX_PATTERN } from '../../../../constants';
import type { TranslateDashboardPanelState } from '../../types';
import {
  getTranslateSplToEsql,
  type GetTranslateSplToEsqlParams,
} from '../../../../../../../common/task/agent/helpers/translate_spl_to_esql';

jest.mock('../../../../../../../common/task/agent/helpers/translate_spl_to_esql', () => ({
  getTranslateSplToEsql: jest.fn(),
  TASK_DESCRIPTION: { migrate_dashboard: 'Migrate Splunk dashboard panel to Elastic' },
}));

jest.mock('@kbn/agent-builder-genai-utils', () => ({
  formatResourceWithSampledValues: jest.fn(),
}));

const mockGetTranslateSplToEsql = jest.mocked(getTranslateSplToEsql);
const mockFormatResourceWithSampledValues = jest.mocked(formatResourceWithSampledValues);

const buildMockEsqlQuery = (indexPattern: string) =>
  `FROM ${indexPattern}\n| WHERE event.category == "process"\n| STATS count = COUNT(*) BY process.name\n| SORT count DESC`;

const buildMockSummary = (indexPattern: string) =>
  `## Translation Summary\n\nThe SPL query was translated to ES|QL. The query reads from \`${indexPattern}\` and filters by event category.`;

const mockParams = {
  esqlKnowledgeBase: {},
  logger: { warn: jest.fn() },
} as unknown as GetTranslateSplToEsqlParams;

const baseState = {
  inline_query: 'index=main sourcetype=WinEventLog | stats count by EventCode',
  parsed_panel: { title: 'Windows Events' },
  dashboard_description: 'Security dashboard',
  description: 'Event code distribution',
} as TranslateDashboardPanelState;

describe('getTranslateQueryNode', () => {
  let mockTranslateFn: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockTranslateFn = jest.fn().mockResolvedValue({
      esqlQuery: buildMockEsqlQuery(TRANSLATION_INDEX_PATTERN),
      comments: [
        {
          message: buildMockSummary(TRANSLATION_INDEX_PATTERN),
          created_at: '2026-01-01T00:00:00.000Z',
          created_by: 'assistant',
        },
      ],
    });

    mockGetTranslateSplToEsql.mockReturnValue(mockTranslateFn);
  });

  it('should default to TRANSLATION_INDEX_PATTERN when no index pattern is provided', async () => {
    const node = getTranslateQueryNode(mockParams);
    const state = { ...baseState, index_pattern: undefined };

    await node(state, {});

    expect(mockTranslateFn).toHaveBeenCalledWith(
      expect.objectContaining({ indexPattern: TRANSLATION_INDEX_PATTERN })
    );
  });

  it('should default to TRANSLATION_INDEX_PATTERN when index pattern is the missing placeholder', async () => {
    const node = getTranslateQueryNode(mockParams);
    const state = { ...baseState, index_pattern: MISSING_INDEX_PATTERN_PLACEHOLDER };

    await node(state, {});

    expect(mockTranslateFn).toHaveBeenCalledWith(
      expect.objectContaining({ indexPattern: TRANSLATION_INDEX_PATTERN })
    );
  });

  it('should have MISSING_INDEX_PATTERN_PLACEHOLDER in the returned query when index pattern is missing', async () => {
    const node = getTranslateQueryNode(mockParams);
    const state = { ...baseState, index_pattern: MISSING_INDEX_PATTERN_PLACEHOLDER };

    const result = await node(state, {});

    expect(result.esql_query).not.toContain(`FROM ${TRANSLATION_INDEX_PATTERN}`);
    expect(result.esql_query).toContain(MISSING_INDEX_PATTERN_PLACEHOLDER);
  });

  it('should keep the actual index pattern in the query when a valid index is found', async () => {
    const node = getTranslateQueryNode(mockParams);
    const state = { ...baseState, index_pattern: 'logs-windows.sysmon_operational-default' };

    const result = await node(state, {});

    expect(mockTranslateFn).toHaveBeenCalledWith(
      expect.objectContaining({ indexPattern: 'logs-windows.sysmon_operational-default' })
    );
    expect(result.comments![0].message).toBe(buildMockSummary(TRANSLATION_INDEX_PATTERN));
  });

  it('should include formatted lookup resources in the translation knowledge base', async () => {
    const node = getTranslateQueryNode(mockParams);
    const state = {
      ...baseState,
      resources: {
        lookup: [
          {
            type: 'lookup',
            name: 'threat_intel_ip',
            content: 'lookup_default_threat_intel_ip',
            fields: [{ path: 'ip', type: 'ip' }],
          },
        ],
      },
    } as TranslateDashboardPanelState;

    await node(state, {});

    expect(mockTranslateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        knowledgeBase: expect.stringContaining('<lookup_resources>'),
      })
    );
    expect(mockTranslateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        knowledgeBase: expect.stringContaining(
          '<lookup_resource source_name="threat_intel_ip" index="lookup_default_threat_intel_ip">'
        ),
      })
    );
    expect(mockTranslateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        knowledgeBase: expect.stringContaining('<field name="ip" type="ip" />'),
      })
    );
  });

  it('should preserve lookup resource context when field metadata is unavailable', async () => {
    const node = getTranslateQueryNode(mockParams);
    const state = {
      ...baseState,
      resources: {
        lookup: [
          {
            type: 'lookup',
            name: 'threat_intel_ip',
            content: 'lookup_default_threat_intel_ip',
          },
        ],
      },
    } as TranslateDashboardPanelState;

    await node(state, {});

    expect(mockTranslateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        knowledgeBase: expect.stringContaining(
          '<lookup_resource source_name="threat_intel_ip" index="lookup_default_threat_intel_ip">'
        ),
      })
    );
    expect(mockTranslateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        knowledgeBase: expect.not.stringContaining('<fields>'),
      })
    );
  });

  it('should combine resolved resource context and lookup resources in the knowledge base', async () => {
    const indexResourceContext = 'resolved index mapping and sampled values';
    mockFormatResourceWithSampledValues.mockReturnValue(indexResourceContext);

    const node = getTranslateQueryNode(mockParams);
    const state = {
      ...baseState,
      resolved_resource: { resource: { name: 'logs-test' } },
      resources: {
        lookup: [
          {
            type: 'lookup',
            name: 'threat_intel_ip',
            content: 'lookup_default_threat_intel_ip',
            fields: [{ path: 'ip', type: 'ip' }],
          },
        ],
      },
    } as unknown as TranslateDashboardPanelState;

    await node(state, {});

    expect(mockTranslateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        knowledgeBase: expect.stringContaining(indexResourceContext),
      })
    );
    expect(mockTranslateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        knowledgeBase: expect.stringContaining('<lookup_resources>'),
      })
    );
  });
});
