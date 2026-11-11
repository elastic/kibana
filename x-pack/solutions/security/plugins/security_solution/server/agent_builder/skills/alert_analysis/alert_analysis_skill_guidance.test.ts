/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import { runSearchTool } from '@kbn/agent-builder-genai-utils/tools';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import type { ToolHandlerContext } from '@kbn/agent-builder-server/tools';
import {
  createToolAvailabilityContext,
  createToolHandlerContext,
  createToolTestMocks,
  setupMockCoreStartServices,
} from '../../__mocks__/test_helpers';
import { alertsTool } from '../../tools/alerts_tool';
import { securityLabsSearchTool } from '../../tools/security_labs_search_tool';
import { entityRiskScoreTool } from '../../tools/entity_analytics/entity_risk_score_tool';
import { getEntityTool } from '../../tools/entity_analytics/get_entity_tool';
import type { SharedServices } from '@kbn/ml-plugin/server/shared_services';
import type { ExperimentalFeatures } from '../../../../common';
import { alertAnalysisSkill } from './alert_analysis_skill';

jest.mock('@kbn/agent-builder-genai-utils/tools', () => ({
  runSearchTool: jest.fn(),
}));

/**
 * Reproduction for https://github.com/elastic/security-team/issues/20696
 *
 * Literal-following models (GPT) execute every step of the skill and call every tool it names.
 * Each test below pins one way the skill hands such a model redundant or impossible work.
 * They fail on main today and must pass once the skill and tool guidance are fixed.
 */
describe('alertAnalysisSkill guidance for literal-following models (security-team#20696)', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();

  beforeEach(() => {
    jest.clearAllMocks();
    setupMockCoreStartServices(mockCore, mockEsClient);
    mockEsClient.asInternalUser.indices.exists.mockResolvedValue(true);
  });

  it('does not tell the model to refetch an alert that is already attached', () => {
    const { content } = alertAnalysisSkill;
    const step1 = content.slice(content.indexOf('### 1.'), content.indexOf('### 2.'));

    // Why: an unconditional "fetch the alert using security.alerts" makes GPT turn an attached
    // alert into an NL -> ES|QL `_id` lookup, a full scan that timed out for ~260s in the thread.
    const fetchesUnconditionally = /fetch the alert using 'security\.alerts'/i.test(step1);
    const isConditionalOnAttachment = /attach|already (in context|available|provided|have)/i.test(
      step1
    );

    expect(fetchesUnconditionally && !isConditionalOnAttachment).toBe(false);
  });

  // Why: security.get_entity exists only when the Entity Store V2 index exists. Where it is missing,
  // a skill that names it without a fallback sends the model looking for it (extra load_skill calls).
  it('says what to do when security.get_entity is not available', () => {
    const { content } = alertAnalysisSkill;
    const step4 = content.slice(content.indexOf('### 4.'), content.indexOf('### 5.'));

    expect(step4).toMatch(/if 'security\.get_entity' is available/i);
    expect(step4).toMatch(/if it is not available, skip this step/i);
    expect(step4).not.toMatch(/entity-analytics skill/i);
    expect(content).toMatch(/do not load another skill or search for another tool/i);
    expect(content).toMatch(/do not load it unless the user asks/i);
  });

  // Why: a plain list needs a few fields per alert. Without this line, the model asks for full rows,
  // which the tool cuts to about 25.
  it('tells the model to ask for summary detail on plain list requests', () => {
    expect(alertAnalysisSkill.content).toMatch(/detail[^.\n]*'summary'[^.\n]*list/i);
  });

  it('only names registry tools that are loadable when skills are enabled', async () => {
    const skillsEnabledUiSettings = uiSettingsServiceMock.createClient();
    skillsEnabledUiSettings.get.mockResolvedValue(true); // agentBuilder:experimentalFeatures

    const registryTools = [
      alertsTool(mockCore, mockLogger),
      securityLabsSearchTool(mockCore),
      entityRiskScoreTool(mockCore, mockLogger),
      getEntityTool(
        mockCore,
        mockLogger,
        null as unknown as SharedServices,
        {
          entityAnalyticsEntityStoreV2: true,
        } as ExperimentalFeatures
      ),
    ];
    const skillRegistryIds = (await alertAnalysisSkill.getRegistryTools?.()) ?? [];
    const availability = await Promise.all(
      registryTools
        .filter(({ id }) => skillRegistryIds.includes(id))
        .map(async ({ id, availability: toolAvailability }) => {
          const { status } = await toolAvailability!.handler(
            createToolAvailabilityContext(mockRequest, 'default', skillsEnabledUiSettings)
          );
          return { id, status };
        })
    );
    const loadableRegistryIds = availability
      .filter(({ status }) => status === 'available')
      .map(({ id }) => id);

    const inlineIds = ((await alertAnalysisSkill.getInlineTools?.()) ?? []).map((t) => t.id);
    const loadableIds = new Set([...loadableRegistryIds, ...inlineIds]);

    // Why: security.entity_risk_score reports "unavailable" whenever skills are on, so the
    // skill's step 4 sends GPT on a search_relevant_skills + load_skill detour (~25 KB of context).
    const namedIds = [...alertAnalysisSkill.content.matchAll(/'(security\.[\w.-]+)'/g)].map(
      ([, id]) => id
    );
    const namedButNotLoadable = [...new Set(namedIds)].filter((id) => !loadableIds.has(id));

    expect(namedButNotLoadable).toEqual([]);
  });

  it('keeps _id and _index out of the field list injected into security.alerts queries', async () => {
    (runSearchTool as jest.Mock).mockResolvedValue([]);
    const mockModelProvider = agentBuilderMocks.createModelProvider();

    await alertsTool(mockCore, mockLogger).handler(
      { query: 'alerts for host-1' },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
        modelProvider: mockModelProvider,
        events: {
          reportProgress: jest.fn(),
          sendUiEvent: jest.fn(),
        } as ToolHandlerContext['events'],
      })
    );

    // Why: the thread links `_index` in the generated KEEP clause to a validation retry, and names
    // `_id` and `_index` as bloat. If the fix must keep `_id` for alert references, relax that half.
    const { nlQuery } = (runSearchTool as jest.Mock).mock.calls[0][0] as { nlQuery: string };
    expect(nlQuery).not.toContain('`_id`');
    expect(nlQuery).not.toContain('`_index`');
  });
});
