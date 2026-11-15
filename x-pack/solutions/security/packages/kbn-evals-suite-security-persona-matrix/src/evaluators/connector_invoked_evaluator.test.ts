/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createConnectorInvokedEvaluator,
  collectProducedText,
} from './connector_invoked_evaluator';

const SLACK_CONNECTOR_ID = 'd7306385-cbe6-4541-9726-49afdff59ba5';

/** A workflow that genuinely posts to Slack — the passing baseline. */
const WORKFLOW_WITH_SLACK = `
name: chrysalis-triage-summary
triggers:
  - type: manual
inputs:
  - name: message
    type: string
steps:
  - name: post-to-slack
    type: http
    connector_id: ${SLACK_CONNECTOR_ID}
    with:
      body: "{{ inputs.message }}"
`;

/** Same workflow with the Slack step removed — the mutation. */
const WORKFLOW_WITHOUT_SLACK = `
name: chrysalis-triage-summary
triggers:
  - type: manual
inputs:
  - name: message
    type: string
steps:
  - name: log-only
    type: console
    with:
      body: "{{ inputs.message }}"
`;

const expectation = {
  expectedConnectorId: SLACK_CONNECTOR_ID,
  expectedStepType: 'http',
};

const run = async (output: unknown, metadata: unknown = expectation) => {
  const evaluator = createConnectorInvokedEvaluator();
  return evaluator.evaluate({ output, metadata } as never);
};

describe('ConnectorInvoked evaluator', () => {
  it('scores 1 when the authored workflow targets the Slack connector', async () => {
    const result = await run({ messages: [{ message: WORKFLOW_WITH_SLACK }] });
    expect(result.score).toBe(1);
    expect(result.metadata).toMatchObject({ connectorPresent: true, stepPresent: true });
  });

  // The mutation that matters: ExpectedToolCalled scores this case 1.0, while the
  // ConnectorInvoked evaluator must score it 0.
  it('scores 0 when the Slack step is removed from the workflow', async () => {
    const result = await run({ messages: [{ message: WORKFLOW_WITHOUT_SLACK }] });
    expect(result.score).toBe(0);
    expect(result.explanation).toContain(SLACK_CONNECTOR_ID);
  });

  it('scores 0 when the workflow points at a different connector', async () => {
    const wrong = WORKFLOW_WITH_SLACK.replace(
      SLACK_CONNECTOR_ID,
      '00000000-dead-beef-0000-000000000000'
    );
    const result = await run({ messages: [{ message: wrong }] });
    expect(result.score).toBe(0);
    expect(result.metadata).toMatchObject({ connectorPresent: false });
  });

  it('does not accept prose that merely describes using an http step', async () => {
    const prose =
      `I would create a workflow that uses an http step against the Slack connector ` +
      `${SLACK_CONNECTOR_ID}, posting the triage summary to #general.`;
    const result = await run({ messages: [{ message: prose }] });
    // Connector id is mentioned, but there is no `type: http` key — narration
    // must not score as an authored workflow.
    expect(result.score).toBe(0);
    expect(result.metadata).toMatchObject({ connectorPresent: true, stepPresent: false });
  });

  it('returns N/A when the example declares no connector expectation', async () => {
    const result = await run({ messages: [{ message: WORKFLOW_WITH_SLACK }] }, {});
    expect(result.score).toBeNull();
    expect(result.label).toBe('N/A');
  });

  // Real agent-mode shapes, captured from a golden security-persona-matrix run:
  // generate_workflow returns only ids + prose (the YAML stays in the
  // attachment) and validate_workflow returns only `{ result }`.
  const agentGenerateStep = (query = 'post to Slack') => ({
    type: 'tool_call',
    tool_id: 'platform.core.generate_workflow',
    params: { query, context: `Connector ID: ${SLACK_CONNECTOR_ID}` },
    results: [
      {
        type: 'other',
        data: {
          comment: 'The workflow is ready and valid.',
          success: true,
          attachment_id: 'att-1',
          attachment_version: 1,
          proposal_id: 'prop-1',
          diff_attachment_id: 'diff-1',
          presentation: 'Render the workflow with "<render_attachment id="att-1" version="1"/>".',
          created: true,
        },
      },
    ],
  });
  const agentValidateStep = (yaml: string) => ({
    type: 'tool_call',
    tool_id: 'platform.workflows.validate_workflow',
    params: { yaml },
    results: [{ type: 'other', data: { result: { valid: true, diagnostics: [] } } }],
  });
  const renderOnlyMessage = {
    messages: [{ message: 'I created the workflow. <render_attachment id="att-1" version="1"/>' }],
  };

  it('passes an agent-mode run whose YAML lives only in validate_workflow params.yaml', async () => {
    const result = await run({
      ...renderOnlyMessage,
      steps: [agentGenerateStep(), agentValidateStep(WORKFLOW_WITH_SLACK)],
    });
    expect(result.score).toBe(1);
  });

  it('passes an agent-mode run whose YAML lives only in the workflow attachment', async () => {
    const result = await run({
      ...renderOnlyMessage,
      steps: [agentGenerateStep()],
      workflowAttachments: [{ id: 'att-1', version: 1, yaml: WORKFLOW_WITH_SLACK }],
    });
    expect(result.score).toBe(1);
  });

  it('scores 0 when an earlier validated draft had the connector but the final workflow dropped it', async () => {
    const result = await run({
      ...renderOnlyMessage,
      steps: [
        agentGenerateStep(),
        agentValidateStep(WORKFLOW_WITH_SLACK),
        agentValidateStep(WORKFLOW_WITHOUT_SLACK),
      ],
    });
    expect(result.score).toBe(0);
    expect(result.metadata).toMatchObject({ connectorPresent: false });
  });

  it('prefers the delivered attachment over validation inputs', async () => {
    const result = await run({
      ...renderOnlyMessage,
      steps: [agentGenerateStep(), agentValidateStep(WORKFLOW_WITH_SLACK)],
      workflowAttachments: [{ id: 'att-1', version: 2, yaml: WORKFLOW_WITHOUT_SLACK }],
    });
    expect(result.score).toBe(0);
  });

  // A final message restating the prompt carries `type: http` + the connector
  // id verbatim; it must not vouch for an artifact that lacks them.
  const promptRestatingMessage = {
    message: `Created it. <render_attachment id="att-1" version="1"/>\nstep type: http on ${SLACK_CONNECTOR_ID}`,
  };

  it('scores 0 when a prompt-restating message accompanies an attachment on the wrong connector', async () => {
    const wrong = WORKFLOW_WITH_SLACK.replace(
      SLACK_CONNECTOR_ID,
      '00000000-dead-beef-0000-000000000000'
    );
    const result = await run({
      messages: [promptRestatingMessage],
      steps: [agentGenerateStep()],
      workflowAttachments: [{ id: 'att-1', version: 1, yaml: wrong }],
    });
    expect(result.score).toBe(0);
    expect(result.metadata).toMatchObject({ connectorPresent: false });
  });

  it('scores 0 when a prompt-restating message accompanies an attachment with no http step', async () => {
    const result = await run({
      messages: [promptRestatingMessage],
      steps: [agentGenerateStep()],
      workflowAttachments: [{ id: 'att-1', version: 1, yaml: WORKFLOW_WITHOUT_SLACK }],
    });
    expect(result.score).toBe(0);
  });

  it('scores 0 when a prompt-restating message accompanies a validated candidate without the step', async () => {
    const result = await run({
      messages: [promptRestatingMessage],
      steps: [agentGenerateStep(), agentValidateStep(WORKFLOW_WITHOUT_SLACK)],
    });
    expect(result.score).toBe(0);
  });

  it('scores only the rendered attachment, not a leftover draft', async () => {
    const result = await run({
      messages: [{ message: 'Done. <render_attachment id="att-2" version="1"/>' }],
      steps: [agentGenerateStep()],
      workflowAttachments: [
        { id: 'att-1', version: 1, yaml: WORKFLOW_WITH_SLACK },
        { id: 'att-2', version: 1, yaml: WORKFLOW_WITHOUT_SLACK },
      ],
    });
    expect(result.score).toBe(0);
  });

  it('passes when the rendered attachment is correct even if an earlier draft was not', async () => {
    const result = await run({
      messages: [{ message: 'Done. <render_attachment id="att-2" version="1"/>' }],
      steps: [agentGenerateStep()],
      workflowAttachments: [
        { id: 'att-1', version: 1, yaml: WORKFLOW_WITHOUT_SLACK },
        { id: 'att-2', version: 1, yaml: WORKFLOW_WITH_SLACK },
      ],
    });
    expect(result.score).toBe(1);
  });

  it('finds the rendered attachment when id is not the first tag attribute', async () => {
    const result = await run({
      messages: [{ message: 'Done. <render_attachment version="1" id="att-good"/>' }],
      steps: [agentGenerateStep()],
      workflowAttachments: [
        { id: 'att-good', version: 1, yaml: WORKFLOW_WITH_SLACK },
        { id: 'att-draft', version: 1, yaml: WORKFLOW_WITHOUT_SLACK },
      ],
    });
    expect(result.score).toBe(1);
  });

  it('does not let generated data.yaml rescue a rendered attachment that dropped the connector', async () => {
    const result = await run({
      ...renderOnlyMessage,
      steps: [
        {
          type: 'tool_call',
          tool_id: 'platform.core.generate_workflow',
          params: { query: 'post to Slack' },
          results: [{ type: 'other', data: { yaml: WORKFLOW_WITH_SLACK } }],
        },
      ],
      workflowAttachments: [{ id: 'att-1', version: 2, yaml: WORKFLOW_WITHOUT_SLACK }],
    });
    expect(result.score).toBe(0);
    expect(result.metadata).toMatchObject({ connectorPresent: false });
  });

  it('passes when generate_workflow returns the YAML itself (non-agent callers)', async () => {
    const result = await run({
      messages: [{ message: 'Here is your workflow.' }],
      steps: [
        {
          type: 'tool_call',
          tool_id: 'platform.core.generate_workflow',
          params: { query: 'post to Slack' },
          results: [{ type: 'other', data: { yaml: WORKFLOW_WITH_SLACK } }],
        },
      ],
    });
    expect(result.score).toBe(1);
  });

  it('scores 0 for an agent-mode run whose validated YAML targets the wrong connector', async () => {
    const wrong = WORKFLOW_WITH_SLACK.replace(
      SLACK_CONNECTOR_ID,
      '00000000-dead-beef-0000-000000000000'
    );
    const result = await run({
      ...renderOnlyMessage,
      steps: [agentGenerateStep(), agentValidateStep(wrong)],
      workflowAttachments: [{ id: 'att-1', version: 1, yaml: wrong }],
    });
    expect(result.score).toBe(0);
    expect(result.metadata).toMatchObject({ connectorPresent: false });
  });

  // The agent echoes the prompt's connector id into generate_workflow params,
  // its own comment prose, reasoning and judge analyses; none is an authored
  // workflow.
  it('does not credit a connector id echoed in tool params, comment, reasoning or analyses', async () => {
    const echoingGenerate = agentGenerateStep(
      `http step on connector ${SLACK_CONNECTOR_ID}, type: http`
    );
    echoingGenerate.results[0].data.comment = `Used connector ${SLACK_CONNECTOR_ID}, type: http.`;
    const result = await run({
      messages: [{ message: 'Done.' }],
      steps: [
        echoingGenerate,
        agentValidateStep(WORKFLOW_WITHOUT_SLACK),
        {
          type: 'tool_call',
          tool_id: 'platform.workflows.get_connectors',
          params: { note: `connector ${SLACK_CONNECTOR_ID} type: http` },
          results: [],
        },
        { type: 'reasoning', reasoning: `use connector ${SLACK_CONNECTOR_ID} with type: http` },
      ],
      correctnessAnalysis: `connector ${SLACK_CONNECTOR_ID} type: http`,
      groundednessAnalysis: `connector ${SLACK_CONNECTOR_ID} type: http`,
    });
    expect(result.score).toBe(0);
    expect(result.metadata).toMatchObject({ connectorPresent: false, stepPresent: false });
  });

  it('ignores yaml params of tools other than validate_workflow', async () => {
    const result = await run({
      messages: [{ message: 'Done.' }],
      steps: [
        {
          type: 'tool_call',
          tool_id: 'platform.core.generate_workflow',
          params: { yaml: WORKFLOW_WITH_SLACK },
          results: [],
        },
        {
          type: 'tool_call',
          tool_id: 'platform.core.search',
          params: { yaml: WORKFLOW_WITH_SLACK },
          results: [{ type: 'other', data: { yaml: WORKFLOW_WITH_SLACK } }],
        },
      ],
    });
    expect(result.score).toBe(0);
  });

  it('does not read validate_workflow results as the authored artifact', async () => {
    const result = await run({
      messages: [{ message: 'Done.' }],
      steps: [
        {
          type: 'tool_call',
          tool_id: 'platform.workflows.validate_workflow',
          params: { yaml: WORKFLOW_WITHOUT_SLACK },
          results: [
            { type: 'other', data: { result: { diagnostics: [`unknown ${SLACK_CONNECTOR_ID}`] } } },
          ],
        },
      ],
    });
    expect(result.score).toBe(0);
  });

  it('treats regex metacharacters in the step type literally', async () => {
    // Unescaped, `a.b` would match `type: axb`. The value comes from dataset
    // metadata, so it must be escaped before being spliced into a RegExp.
    const result = await run(
      { messages: [{ message: 'steps:\n  - type: axb\n' }] },
      { expectedStepType: 'a.b' }
    );
    expect(result.score).toBe(0);
  });

  describe('collectProducedText', () => {
    it('falls back to the final messages when no artifact YAML was recovered', () => {
      expect(collectProducedText({ messages: [{ message: 'inline-yaml' }] })).toBe('inline-yaml');
    });

    it('reads only the delivered attachment; generate data.yaml, validate params.yaml and messages are fallbacks', () => {
      const text = collectProducedText({
        messages: [{ message: 'one' }],
        workflowAttachments: [{ id: 'a', version: 1, yaml: 'attachment-yaml' }],
        steps: [
          {
            tool_id: 'platform.workflows.validate_workflow',
            params: { yaml: 'validated-yaml' },
            results: [{ data: { result: 'validate-result-only' } }],
          },
          {
            tool_id: 'platform.core.generate_workflow',
            params: { query: 'generate-param-only', yaml: 'generate-param-yaml' },
            results: [{ data: { yaml: 'generated-yaml', comment: 'comment-only' } }],
          },
        ],
        correctnessAnalysis: 'analysis-only',
      });
      expect(text).not.toContain('one');
      expect(text).toContain('attachment-yaml');
      expect(text).not.toContain('validated-yaml');
      expect(text).not.toContain('generated-yaml');
      ['validate-result-only', 'generate-param', 'comment-only', 'analysis-only'].forEach(
        (excluded) => expect(text).not.toContain(excluded)
      );
    });
  });
});
