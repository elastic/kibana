/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import { AttackDiscoveryAgentBuilderChatClient, parseInsightsFromSteps } from './chat_client';

// Fix 7 (Defect D): the agent emits the mandated insights JSON
// (attack_discovery_generator_skill.ts:295) as part of one output stream, but
// the platform splits that stream — on long runs the report and its fenced JSON
// arrive in a `reasoning` step while `response.message` holds only a short
// wrap-up. Reading the message alone scored a fully compliant agent 0 on
// AttackDiscoveryBasic/Criteria/Rubric.
//
// The reasoning payload below is the literal one captured from the
// `live-retrieval` example of a live run.
const REASONING_WITH_INSIGHTS = `The pipeline completed successfully. Here is the full Attack Discovery Report.

# Attack Discovery Report

- **Total Alerts Analysed:** 2

\`\`\`json
{
  "insights": [
    {
      "alertIds": [
        "ad2-agent-builder-eval-20260712-powershell",
        "ad2-agent-builder-eval-20260712-lsass"
      ],
      "title": "Encoded PowerShell Followed by LSASS Dump",
      "summaryMarkdown": "On {{ host.name finance-ws-01 }}, encoded PowerShell execution was followed by LSASS credential dumping.",
      "entitySummaryMarkdown": "Attack chain detected on {{ host.name finance-ws-01 }}.",
      "detailsMarkdown": "A two-stage attack chain was identified within a 60-second window."
    }
  ]
}
\`\`\`

> I can create the proposed rule(s) now.`;

describe('parseInsightsFromSteps', () => {
  it('reads the insights JSON the agent rendered into a reasoning step', () => {
    const insights = parseInsightsFromSteps([
      { type: 'tool_call', tool_id: 'security.attack-discovery.run', results: [] },
      { type: 'reasoning', reasoning: REASONING_WITH_INSIGHTS },
      { type: 'update_todos' },
    ]);

    expect(insights).toEqual([
      expect.objectContaining({
        title: 'Encoded PowerShell Followed by LSASS Dump',
        alertIds: [
          'ad2-agent-builder-eval-20260712-powershell',
          'ad2-agent-builder-eval-20260712-lsass',
        ],
      }),
    ]);
  });

  it('returns null when no step carries an insights block', () => {
    expect(
      parseInsightsFromSteps([
        { type: 'reasoning', reasoning: 'Retrieved 2 alerts. Running the pipeline now.' },
        { type: 'update_todos' },
      ])
    ).toBeNull();
  });

  // The scan must never source insights from the AD tool's own return value:
  // `security.attack-discovery.run` populates `attack_discoveries` whether or
  // not the agent renders it, so reading tool results would make the
  // insight-backed evaluators structurally blind to a missing report — which is
  // what `AdToolResult` already covers.
  it('ignores insights sitting in a tool result rather than agent output', () => {
    expect(
      parseInsightsFromSteps([
        {
          type: 'tool_call',
          tool_id: 'security.attack-discovery.run',
          results: [
            {
              data: {
                status: 'completed',
                discovery_count: 1,
                attack_discoveries: [{ title: 'From the tool, not the agent' }],
              },
              tool_result_id: 'LIuuLM',
              type: 'other',
            },
          ],
        },
      ])
    ).toBeNull();
  });

  // `load_skill` results carry the skill body — which embeds the mandated
  // insights schema as a fenced JSON example — under `data.content`. Only the
  // `type === 'reasoning'` check keeps a non-reasoning step out of the scan, so
  // this asserts the step type gates the read, not merely the field name.
  it('ignores a non-reasoning step even when it carries a reasoning string', () => {
    expect(
      parseInsightsFromSteps([
        {
          type: 'tool_call',
          tool_id: 'load_skill',
          reasoning: REASONING_WITH_INSIGHTS,
        },
      ])
    ).toBeNull();
  });

  it('prefers the last reasoning step when several carry insights', () => {
    const earlier = REASONING_WITH_INSIGHTS.replace(
      'Encoded PowerShell Followed by LSASS Dump',
      'Superseded draft'
    );

    const insights = parseInsightsFromSteps([
      { type: 'reasoning', reasoning: earlier },
      { type: 'reasoning', reasoning: REASONING_WITH_INSIGHTS },
    ]);

    expect(insights?.[0].title).toBe('Encoded PowerShell Followed by LSASS Dump');
  });
});

describe('AttackDiscoveryAgentBuilderChatClient.converse', () => {
  const buildClient = (response: {
    steps?: unknown[];
    response: { message: string };
    trace_id?: string;
  }) => {
    const fetch = jest.fn().mockResolvedValue(response) as unknown as HttpHandler;
    const log = { error: jest.fn() } as unknown as ToolingLog;

    return new AttackDiscoveryAgentBuilderChatClient(fetch, log, 'test-connector');
  };

  it('resolves insights from the final message when it carries the fence', async () => {
    const client = buildClient({
      response: { message: REASONING_WITH_INSIGHTS },
      steps: [],
    });

    const result = await client.converse('run attack discovery');

    expect(result.insights?.[0].title).toBe('Encoded PowerShell Followed by LSASS Dump');
  });

  // Guards the wiring, not just the helper: with the fence only in a reasoning
  // step, `converse` must still surface insights or the insight-backed
  // evaluators score a compliant agent 0.
  it('falls back to the reasoning steps when the final message has no fence', async () => {
    const client = buildClient({
      response: { message: 'Pipeline status: completed — 1 validated discovery.' },
      steps: [{ type: 'reasoning', reasoning: REASONING_WITH_INSIGHTS }, { type: 'update_todos' }],
    });

    const result = await client.converse('run attack discovery');

    expect(result.insights?.[0].title).toBe('Encoded PowerShell Followed by LSASS Dump');
  });

  it('leaves insights null when neither the message nor the steps carry a fence', async () => {
    const client = buildClient({
      response: { message: 'Generation is still in progress.' },
      steps: [{ type: 'reasoning', reasoning: 'Waiting on the pipeline.' }],
    });

    const result = await client.converse('check status');

    expect(result.insights).toBeNull();
  });
});
