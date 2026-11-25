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

  // Why: security-team#21037 — queue/list questions with the skill cost ~2.8x tokens vs no-skill when
  // the model still runs related-alerts, Security Labs, and get_entity. The queue path must stop after
  // security.alerts.
  it('tells the model to stop after security.alerts on list/count questions', () => {
    const { content } = alertAnalysisSkill;
    const queuePath = content.slice(
      content.indexOf('### Queue path'),
      content.indexOf('### Triage path')
    );

    expect(queuePath).toMatch(/call only 'security\.alerts'/i);
    expect(queuePath).toMatch(/stop/i);
    expect(queuePath).toMatch(/do NOT call 'security\.alert-analysis\.get-related-alerts'/i);
    expect(queuePath).toMatch(/'security\.security_labs_search'/i);
    expect(queuePath).toMatch(/'security\.get_entity'/i);
  });

  // Why: the shipped step 1 reused an attached alert. A set of attached alerts must not be replaced by
  // live queue results.
  it('keeps attached alerts, one or a set, out of the queue lookup', () => {
    const { content } = alertAnalysisSkill;
    const chooser = content.slice(
      content.indexOf('## Choose a Path First'),
      content.indexOf('### Queue path')
    );

    expect(chooser).toMatch(
      /attached alerts[^\n]*\(one alert or a set\)[^\n]*do not fetch them again/i
    );
    expect(content).toMatch(/### Triage path \(specific alerts, attached or named by id\)/i);
  });

  // Why: "prioritize" sat under the stop-after-security.alerts path and under the evidence step at the
  // same time, so the model had two opposite instructions for "which alert do I handle first".
  it('sends judgment questions out of the queue path instead of stopping', () => {
    const { content } = alertAnalysisSkill;
    const queuePath = content.slice(
      content.indexOf('### Queue path'),
      content.indexOf('### Judgment questions')
    );

    expect(content).toMatch(/### Queue path \(plain list, count, or summary/i);
    expect(queuePath).not.toMatch(/prioritize/i);
    expect(queuePath).toMatch(/which alert to handle first[^\n]*use the next two sections/i);
  });

  // Why: each security.alerts call runs an NL -> ES|QL generator on a second model. In the 21037 lab it
  // was ~70% of the extra input tokens, and the model called the tool ~2.8 times per run.
  it('tells the model to call security.alerts once and tally breakdowns itself', () => {
    const { content } = alertAnalysisSkill;
    const queuePath = content.slice(
      content.indexOf('### Queue path'),
      content.indexOf('### Judgment questions')
    );

    expect(queuePath).toMatch(/call 'security\.alerts' once/i);
    expect(queuePath).toMatch(/tally them yourself/i);
  });

  // Why: with a hard stop after security.alerts, every skill arm answered "nothing is on fire" from
  // alert severity alone (security-team#21037, question 14). Threshold alerts also carry no host or IP.
  it('tells the model to check the events behind the alerts on judgment questions', () => {
    const { content } = alertAnalysisSkill;
    const evidence = content.slice(
      content.indexOf('### Check the evidence before you answer'),
      content.indexOf('### Triage path')
    );

    expect(evidence).toMatch(/"on fire"/i);
    expect(evidence).toMatch(/share hosts or IPs/i);
    expect(evidence).toMatch(/ES\|QL tool if it is available/i);
    expect(evidence).toMatch(/in one query/i);
  });

  // Why: in the 21037 lab the model ran 8-9 ES|QL calls on some questions, and sometimes queried the
  // alerts index, which is not scoped to the current space. It also searched events only inside the
  // alerts' 24h window, found nothing (the events were older than the alerts), and answered "nothing is
  // on fire" (question 14).
  it('bounds the ES|QL evidence step and keeps it off the alerts index', () => {
    const { content } = alertAnalysisSkill;
    const evidence = content.slice(
      content.indexOf('### Check the evidence before you answer'),
      content.indexOf('### Triage path')
    );

    expect(evidence).toMatch(/never the alerts index/i);
    expect(evidence).toMatch(/at most three ES\|QL calls/i);
    expect(evidence).toMatch(/not when the events happened/i);
    expect(evidence).toMatch(/at least the last 30 days/i);
    expect(evidence).toMatch(/never answer that nothing is wrong from an empty result/i);
    expect(evidence).toMatch(
      /if the ES\|QL tool is not available, say that the events were not checked/i
    );
    expect(content).toMatch(
      /never query the alerts index \('\.alerts-security\.alerts-\*'\) with ES\|QL/i
    );
  });

  it('limits entity and related-alert lookups on judgment questions', () => {
    const { content } = alertAnalysisSkill;
    const judgment = content.slice(
      content.indexOf('### Judgment questions'),
      content.indexOf('### Check the evidence')
    );

    expect(judgment).toMatch(/at most one call to each tool/i);
    expect(judgment).toMatch(/'security\.get_entity'[^\n]*at most two entities/i);
    expect(judgment).toMatch(/get-related-alerts'[^\n]*carry host or IP values/i);
    expect(judgment).toMatch(/security_labs_search'[^\n]*threat intelligence/i);
  });

  // Why: security.get_entity exists only when the Entity Store V2 index exists. Where it is missing,
  // a skill that names it without a fallback sends the model looking for it (extra load_skill calls).
  // PR #304299 made Claude call it on every triage run (0.07 → 2.0); keep it triage-only.
  it('says what to do when security.get_entity is not available', () => {
    const { content } = alertAnalysisSkill;
    const step4 = content.slice(content.indexOf('### 4.'), content.indexOf('### 5.'));

    expect(step4).toMatch(/on the triage path\. skip it for list, count/i);
    expect(step4).toMatch(/if 'security\.get_entity' is available/i);
    expect(step4).toMatch(/if it is not available, skip this step/i);
    expect(step4).not.toMatch(/entity-analytics skill/i);
    expect(content).toMatch(/do not load another skill or search for another tool/i);
    expect(content).toMatch(/do not load it unless the user asks/i);
  });

  // Why: a plain list needs a few fields per alert. Without this line, the model asks for full rows,
  // which the tool cuts to about 25.
  it('tells the model to ask for summary detail on plain list requests', () => {
    expect(alertAnalysisSkill.content).toMatch(/detail[^.\n]*'summary'/i);
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
