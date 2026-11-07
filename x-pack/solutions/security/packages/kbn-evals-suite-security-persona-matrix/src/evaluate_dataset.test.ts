/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { DefaultEvaluators, EvalsExecutorClient, Evaluator, TaskOutput } from '@kbn/evals';
import {
  toDatasetExample,
  createEvaluatePersonaMatrixDataset,
  createPersonaMatrixTrajectoryEvaluator,
  createPersonaMatrixExpectedToolCalledEvaluator,
  createPersonaMatrixFinalAnswerPresentEvaluator,
  createPersonaMatrixMinExpectedStepsEvaluator,
  createPersonaMatrixSkillInvokedEvaluator,
  isRankablePathContract,
  type PersonaMatrixDatasetExample,
} from './evaluate_dataset';
import type { PersonaMatrixChatClient } from './chat_client';
import {
  PERSONA_MATRIX_EXAMPLES,
  type PersonaMatrixExample,
} from './datasets/persona_matrix_prompts';

const baseExample: PersonaMatrixExample = {
  id: 'example-a',
  category: 'alert-analysis',
  variant: 'A',
  description: 'test example',
  input: { question: 'what happened?' },
  output: { reference: 'the reference answer' },
  metadata: {
    expectedSkill: 'alert-analysis',
    expectedTools: ['security.alerts', 'security.get_related_alerts'],
    severity: 'high',
    tags: ['triage'],
  },
};

const buildLog = (): ToolingLog =>
  ({
    info: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  } as unknown as ToolingLog);

describe('path contract classification', () => {
  it('keeps probes diagnostic and leaves candidate/rankable paths measurable', () => {
    expect(isRankablePathContract({ pathContract: 'probe' })).toBe(false);
    expect(isRankablePathContract({ pathContract: 'candidate' })).toBe(true);
    expect(isRankablePathContract({ pathContract: 'rankable' })).toBe(true);
    expect(isRankablePathContract(undefined)).toBe(true);
  });

  it('marks every hunt example as a probe', () => {
    const probePrefixes = [
      'alert-analysis-',
      'entity-analytics-',
      'multi-step-',
      'threat-hunting-',
    ];
    const probes = PERSONA_MATRIX_EXAMPLES.filter((example) =>
      probePrefixes.some((prefix) => example.id.startsWith(prefix))
    );
    expect(probes).toHaveLength(12);
    expect(probes.every((example) => example.metadata.pathContract === 'probe')).toBe(true);
  });
});

describe('toDatasetExample', () => {
  it('resolves the golden path from metadata.expectedTools into output.tool_sequence', () => {
    // The trajectory evaluator's goldenPathExtractor only receives `expected`
    // (a sibling of `metadata`, not a parent — kbn-evals/src/evaluators/trajectory/index.ts,
    // kbn-evals/src/types.ts). Without this mapping step the annotation on
    // `metadata.expectedTools` is unreachable from inside that callback.
    const wrapped = toDatasetExample(baseExample);
    expect(wrapped.output.tool_sequence).toEqual([
      'security.alerts',
      'security.get_related_alerts',
    ]);
  });

  it('mirrors reference into output.expected so correctness/index.ts resolves ground truth', () => {
    // correctness/index.ts reads `expected?.expected`, not `expected?.reference`.
    const wrapped = toDatasetExample(baseExample);
    expect(wrapped.output.reference).toBe('the reference answer');
    expect(wrapped.output.expected).toBe('the reference answer');
  });

  it('omits tool_sequence when the example has no expectedTools annotation', () => {
    const unannotated: PersonaMatrixExample = {
      ...baseExample,
      metadata: { ...baseExample.metadata, expectedTools: undefined },
    };
    const wrapped = toDatasetExample(unannotated);
    expect(wrapped.output).not.toHaveProperty('tool_sequence');
  });

  it('populates expected for every example in the real dataset', () => {
    // Regression guard for the class of bug this suite shipped with: a
    // silent drop here means correctness/index.ts silently judges `undefined`
    // again for every example, and only a real run would surface it.
    const wrapped = PERSONA_MATRIX_EXAMPLES.map(toDatasetExample);
    expect(wrapped).toHaveLength(21);
    for (const example of wrapped) {
      expect(typeof example.output.expected).toBe('string');
      expect(example.output.expected.length).toBeGreaterThan(0);
      expect(example.output.expected).toBe(example.output.reference);
    }
  });
});

describe('createPersonaMatrixTrajectoryEvaluator', () => {
  const buildArgs = (
    example: PersonaMatrixExample,
    steps: Array<{ type?: string; tool_id?: string }>
  ) => {
    const wrapped: PersonaMatrixDatasetExample = toDatasetExample(example);
    return {
      input: wrapped.input,
      expected: wrapped.output,
      output: { steps } as unknown as TaskOutput,
      metadata: wrapped.metadata,
    } as unknown as Parameters<
      ReturnType<typeof createPersonaMatrixTrajectoryEvaluator>['evaluate']
    >[0];
  };

  it('returns N/A, not a score, when the example has no tool_sequence annotation', async () => {
    const evaluator = createPersonaMatrixTrajectoryEvaluator();
    const unannotated: PersonaMatrixExample = {
      ...baseExample,
      metadata: { ...baseExample.metadata, expectedTools: undefined },
    };
    const result = await evaluator.evaluate(
      buildArgs(unannotated, [{ type: 'tool_call', tool_id: 'security.alerts' }])
    );
    expect(result.score).toBeNull();
    expect(result.label).toBe('N/A');
  });

  it('scores non-null when the example is annotated and the agent calls the golden tools', async () => {
    // Regression guard for the inverted-scoring bug: before the fix, an
    // annotated example whose agent correctly called tools scored a hard
    // 0.0 because goldenPathExtractor read the (always-empty) tool_sequence
    // field directly instead of the mapped output.
    const evaluator = createPersonaMatrixTrajectoryEvaluator();
    const result = await evaluator.evaluate(
      buildArgs(baseExample, [
        { type: 'tool_call', tool_id: 'security.alerts' },
        { type: 'tool_call', tool_id: 'security.get_related_alerts' },
      ])
    );
    expect(result.score).not.toBeNull();
    expect(result.score).toBeGreaterThan(0);
  });

  it('excludes filestore.read from the actual tool sequence', async () => {
    const evaluator = createPersonaMatrixTrajectoryEvaluator();
    const result = await evaluator.evaluate(
      buildArgs(baseExample, [
        { type: 'tool_call', tool_id: 'filestore.read' },
        { type: 'tool_call', tool_id: 'security.alerts' },
        { type: 'tool_call', tool_id: 'security.get_related_alerts' },
      ])
    );
    const metadata = result.metadata as { actual: string[] } | undefined;
    expect(metadata?.actual).not.toContain('filestore.read');
  });

  it('every real dataset example resolves a non-empty expected tool list in evaluator metadata', async () => {
    // Countable per-example gate (not an aggregate score): for each of the
    // 21 annotated examples, the resolved `expected` tool list in evaluator
    // metadata must be non-empty and equal that example's expectedTools.
    // Falsifiable against the dataset and immune to how the agent orders
    // its calls.
    const evaluator = createPersonaMatrixTrajectoryEvaluator();
    for (const example of PERSONA_MATRIX_EXAMPLES) {
      const wrapped = toDatasetExample(example);
      const result = await evaluator.evaluate(
        buildArgs(
          example,
          (example.metadata.expectedTools ?? []).map((toolId) => ({
            type: 'tool_call',
            tool_id: toolId,
          }))
        )
      );
      if (example.metadata.pathContract === 'probe') {
        expect(result.score).toBeNull();
        expect(result.metadata).toMatchObject({ pathContract: 'probe' });
      } else {
        expect(result.score).not.toBeNull();
        const metadata = result.metadata as { expected: string[] } | undefined;
        expect(metadata?.expected).toEqual(wrapped.output.tool_sequence);
      }
    }
  });
});

describe('createPersonaMatrixExpectedToolCalledEvaluator', () => {
  it('scores 1 when every declared expected tool was called', async () => {
    const evaluator = createPersonaMatrixExpectedToolCalledEvaluator();
    const result = await evaluator.evaluate({
      input: { question: 'q' },
      expected: toDatasetExample(baseExample).output,
      output: {
        steps: [
          { type: 'tool_call', tool_id: 'security.alerts' },
          { type: 'tool_call', tool_id: 'security.get_related_alerts' },
        ],
      } as unknown as TaskOutput,
      metadata: baseExample.metadata,
    } as unknown as Parameters<ReturnType<typeof createPersonaMatrixExpectedToolCalledEvaluator>['evaluate']>[0]);
    expect(result.score).toBe(1);
  });

  it('returns N/A when the example has no expectedTools annotation', async () => {
    const evaluator = createPersonaMatrixExpectedToolCalledEvaluator();
    const unannotated: PersonaMatrixExample = {
      ...baseExample,
      metadata: { ...baseExample.metadata, expectedTools: undefined },
    };
    const result = await evaluator.evaluate({
      input: { question: 'q' },
      expected: toDatasetExample(unannotated).output,
      output: { steps: [] } as unknown as TaskOutput,
      metadata: unannotated.metadata,
    } as unknown as Parameters<ReturnType<typeof createPersonaMatrixExpectedToolCalledEvaluator>['evaluate']>[0]);
    expect(result.score).toBeNull();
    expect(result.label).toBe('N/A');
  });

  // Regression: only `expectedTools[0]` used to be checked, so a run that
  // skipped every later declared tool still scored a full 1.
  it('scores 0 when a non-primary expected tool was skipped', async () => {
    const evaluator = createPersonaMatrixExpectedToolCalledEvaluator();
    const multiTool: PersonaMatrixExample = {
      ...baseExample,
      metadata: {
        ...baseExample.metadata,
        expectedTools: ['platform.core.generate_esql', 'platform.core.execute_esql'],
      },
    };
    const result = await evaluator.evaluate({
      input: { question: 'q' },
      expected: toDatasetExample(multiTool).output,
      output: {
        steps: [{ type: 'tool_call', tool_id: 'platform.core.generate_esql' }],
      } as unknown as TaskOutput,
      metadata: multiTool.metadata,
    } as unknown as Parameters<ReturnType<typeof createPersonaMatrixExpectedToolCalledEvaluator>['evaluate']>[0]);
    expect(result.score).toBe(0);
    expect((result.metadata as { missingToolIds: string[] }).missingToolIds).toEqual([
      'platform.core.execute_esql',
    ]);
  });

  it('scores 1 only when every declared expected tool was called', async () => {
    const evaluator = createPersonaMatrixExpectedToolCalledEvaluator();
    const multiTool: PersonaMatrixExample = {
      ...baseExample,
      metadata: {
        ...baseExample.metadata,
        expectedTools: ['platform.core.generate_esql', 'platform.core.execute_esql'],
      },
    };
    const result = await evaluator.evaluate({
      input: { question: 'q' },
      expected: toDatasetExample(multiTool).output,
      output: {
        steps: [
          { type: 'tool_call', tool_id: 'platform.core.generate_esql' },
          { type: 'tool_call', tool_id: 'platform.core.list_indices' },
          { type: 'tool_call', tool_id: 'platform.core.execute_esql' },
        ],
      } as unknown as TaskOutput,
      metadata: multiTool.metadata,
    } as unknown as Parameters<ReturnType<typeof createPersonaMatrixExpectedToolCalledEvaluator>['evaluate']>[0]);
    expect(result.score).toBe(1);
    expect((result.metadata as { missingToolIds: string[] }).missingToolIds).toEqual([]);
  });
});

describe('createPersonaMatrixFinalAnswerPresentEvaluator', () => {
  const evaluate = (output: unknown) =>
    createPersonaMatrixFinalAnswerPresentEvaluator().evaluate({
      input: { question: 'q' },
      expected: undefined,
      output,
      metadata: {},
    } as unknown as Parameters<ReturnType<typeof createPersonaMatrixFinalAnswerPresentEvaluator>['evaluate']>[0]);

  it('scores 1 when the run produced a non-empty final message', async () => {
    const result = await evaluate({ messages: [{ message: 'Rule created: ...' }] });
    expect(result.score).toBe(1);
  });

  it('scores 0 when the only message is the last-assistant-step fallback', async () => {
    const result = await evaluate({
      messages: [{ message: 'Let me check that rule.' }],
      messageSource: 'last_assistant_step',
    });
    expect(result.score).toBe(0);
  });

  it('scores 1 for a real closing message even when messageSource is "response"', async () => {
    const result = await evaluate({
      messages: [{ message: 'Done.' }],
      messageSource: 'response',
    });
    expect(result.score).toBe(1);
  });

  // Regression: some detection-rule-edit runs ended
  // on a tool call with no user-facing closing text.
  it('scores 0 when every message is empty', async () => {
    const result = await evaluate({ messages: [{ message: '' }] });
    expect(result.score).toBe(0);
  });

  it('scores 0 when messages are missing from the output', async () => {
    const result = await evaluate({ steps: [] });
    expect(result.score).toBe(0);
  });

  const ruleToolStep = (data: unknown, toolId = 'security.create_detection_rule') => ({
    type: 'tool_call',
    tool_id: toolId,
    results: [{ type: 'other', data }],
  });

  const RULE_ATTACHMENT_ID = 'rule_attachment_1';
  const renderTag = (id: string) => `<render_attachment id="${id}" version="1" />`;
  const createdRule = (extra: Record<string, unknown> = {}) => ({
    success: true,
    rule: { id: 'abc', severity: 'high' },
    attachment_id: RULE_ATTACHMENT_ID,
    ...extra,
  });

  // The detection-rule-edit references ask the agent to render the created rule
  // attachment inline "rather than describing the rule in prose only". A run
  // whose only message is chat_client's last-assistant-step fallback but that
  // emitted the matching render tag HAS shown the rule to the user.
  it('scores 1 when the run rendered the created rule via a matching render tag', async () => {
    const result = await evaluate({
      messages: [{ message: renderTag(RULE_ATTACHMENT_ID) }],
      messageSource: 'last_assistant_step',
      steps: [ruleToolStep(createdRule())],
    });
    expect(result.score).toBe(1);
    expect(result.explanation).toContain('artifact');
  });

  it('scores 1 for an update_detection_rule artifact as well', async () => {
    const result = await evaluate({
      messages: [{ message: renderTag(RULE_ATTACHMENT_ID) }],
      messageSource: 'last_assistant_step',
      steps: [ruleToolStep(createdRule(), 'security.update_detection_rule')],
    });
    expect(result.score).toBe(1);
  });

  // The rule tool only stores the attachment; without the render tag the user
  // sees nothing. This is the silent-termination case the gate must catch.
  it('scores 0 when a rule was created but no render tag was emitted', async () => {
    const result = await evaluate({
      messages: [{ message: '' }],
      steps: [ruleToolStep(createdRule())],
    });
    expect(result.score).toBe(0);
  });

  it('scores 0 when the fallback narration does not render the created attachment', async () => {
    const result = await evaluate({
      messages: [{ message: 'Let me create that rule.' }],
      messageSource: 'last_assistant_step',
      steps: [ruleToolStep(createdRule())],
    });
    expect(result.score).toBe(0);
  });

  it('scores 0 when the render tag points at a different attachment', async () => {
    const result = await evaluate({
      messages: [{ message: renderTag('some_other_attachment') }],
      messageSource: 'last_assistant_step',
      steps: [ruleToolStep(createdRule())],
    });
    expect(result.score).toBe(0);
  });

  it('still scores 0 when the rule tool call failed', async () => {
    const result = await evaluate({
      messages: [{ message: renderTag(RULE_ATTACHMENT_ID) }],
      messageSource: 'last_assistant_step',
      steps: [ruleToolStep(createdRule({ success: false }))],
    });
    expect(result.score).toBe(0);
  });

  it('still scores 0 when a rule tool reported success without a rule payload', async () => {
    const result = await evaluate({
      messages: [{ message: renderTag(RULE_ATTACHMENT_ID) }],
      messageSource: 'last_assistant_step',
      steps: [ruleToolStep({ success: true, attachment_id: RULE_ATTACHMENT_ID })],
    });
    expect(result.score).toBe(0);
  });

  it('does not count a non-artifact tool call as an answer', async () => {
    const result = await evaluate({
      messages: [{ message: renderTag(RULE_ATTACHMENT_ID) }],
      messageSource: 'last_assistant_step',
      steps: [ruleToolStep(createdRule(), 'security.run_rule_preview')],
    });
    expect(result.score).toBe(0);
  });

  // `generate_workflow` returns only ids plus prose; the user sees the workflow
  // solely through the render tag, exactly like a created rule.
  const generateWorkflowStep = (data: unknown) =>
    ruleToolStep(data, 'platform.core.generate_workflow');
  const WORKFLOW_ATTACHMENT_ID = 'wf_attachment_1';
  const generatedWorkflow = (extra: Record<string, unknown> = {}) => ({
    success: true,
    attachment_id: WORKFLOW_ATTACHMENT_ID,
    attachment_version: 1,
    ...extra,
  });

  it('scores 1 when the run rendered the generated workflow via a matching render tag', async () => {
    const result = await evaluate({
      messages: [{ message: renderTag(WORKFLOW_ATTACHMENT_ID) }],
      messageSource: 'last_assistant_step',
      steps: [generateWorkflowStep(generatedWorkflow())],
    });
    expect(result.score).toBe(1);
    expect(result.explanation).toContain('artifact');
  });

  it('scores 0 when a workflow was generated but never rendered', async () => {
    const result = await evaluate({
      messages: [{ message: 'Let me draft that workflow.' }],
      messageSource: 'last_assistant_step',
      steps: [generateWorkflowStep(generatedWorkflow())],
    });
    expect(result.score).toBe(0);
  });

  it('scores 0 when generate_workflow failed or returned no attachment id', async () => {
    const failed = await evaluate({
      messages: [{ message: renderTag(WORKFLOW_ATTACHMENT_ID) }],
      messageSource: 'last_assistant_step',
      steps: [generateWorkflowStep(generatedWorkflow({ success: false }))],
    });
    const noId = await evaluate({
      messages: [{ message: renderTag(WORKFLOW_ATTACHMENT_ID) }],
      messageSource: 'last_assistant_step',
      steps: [generateWorkflowStep({ success: true })],
    });
    expect(failed.score).toBe(0);
    expect(noId.score).toBe(0);
  });

  it('returns N/A when there is no task output at all', async () => {
    const result = await evaluate(undefined);
    expect(result.score).toBeNull();
    expect(result.label).toBe('N/A');
  });
});

describe('createPersonaMatrixMinExpectedStepsEvaluator', () => {
  const toolStep = (id: string) => ({ type: 'tool_call', tool_id: id });
  const evaluate = (output: unknown, expectedTools?: string[]) =>
    createPersonaMatrixMinExpectedStepsEvaluator().evaluate({
      input: { question: 'q' },
      expected: expectedTools ? { tool_sequence: expectedTools } : {},
      output,
      metadata: expectedTools ? { expectedTools } : {},
    } as unknown as Parameters<ReturnType<typeof createPersonaMatrixMinExpectedStepsEvaluator>['evaluate']>[0]);

  it('scores 1 when tool calls meet the expected minimum', async () => {
    const result = await evaluate(
      { steps: [toolStep('platform.core.generate_esql'), toolStep('platform.core.execute_esql')] },
      ['platform.core.generate_esql', 'platform.core.execute_esql']
    );
    expect(result.score).toBe(1);
  });

  // Regression: some runs produced an answer in <3 steps having
  // called nothing — premature termination that FinalAnswerPresent alone misses.
  it('scores 0 when the agent gave up without trying (fewer calls than expected)', async () => {
    const result = await evaluate({ steps: [] }, ['on_call_lookup']);
    expect(result.score).toBe(0);
  });

  it('scores 0 when only some of the expected tools were called', async () => {
    const result = await evaluate({ steps: [toolStep('platform.core.generate_esql')] }, [
      'platform.core.generate_esql',
      'platform.core.execute_esql',
    ]);
    expect(result.score).toBe(0);
  });

  it('returns N/A when the example declares no expectedTools', async () => {
    const result = await evaluate({ steps: [toolStep('x')] });
    expect(result.score).toBeNull();
    expect(result.label).toBe('N/A');
  });

  it('returns N/A when there is no task output', async () => {
    const result = await evaluate(undefined, ['on_call_lookup']);
    expect(result.score).toBeNull();
    expect(result.label).toBe('N/A');
  });
});

describe('createPersonaMatrixSkillInvokedEvaluator', () => {
  const buildEvaluatorArgs = (metadata: PersonaMatrixExample['metadata'], traceId?: string) =>
    ({
      input: { question: 'q' },
      expected: {},
      output: { traceId } as unknown as TaskOutput,
      metadata,
    } as unknown as Parameters<
      ReturnType<typeof createPersonaMatrixSkillInvokedEvaluator>['evaluate']
    >[0]);

  it('returns N/A when the example has no expectedSkill/allowSkills annotation', async () => {
    // 4 of the 21 real examples (workflow-authoring-b/c, workflow-execution-a/b)
    // legitimately have no expectedSkill — platform.core.generate_workflow does
    // not require a skill load. Those must report N/A, not a failing score.
    const evaluator = createPersonaMatrixSkillInvokedEvaluator({
      traceEsClient: { esql: { query: jest.fn() } } as unknown as EsClient,
      log: buildLog(),
    });
    const result = await evaluator.evaluate(
      buildEvaluatorArgs({ ...baseExample.metadata, expectedSkill: undefined }, 'abcd')
    );
    expect(result.score).toBeNull();
    expect(result.label).toBe('N/A');
  });

  it('returns unavailable, not a failing score, when there is no usable traceId', async () => {
    const evaluator = createPersonaMatrixSkillInvokedEvaluator({
      traceEsClient: { esql: { query: jest.fn() } } as unknown as EsClient,
      log: buildLog(),
    });
    const result = await evaluator.evaluate(buildEvaluatorArgs(baseExample.metadata, undefined));
    expect(result.score).toBeNull();
    expect(result.label).toBe('unavailable');
  });

  it('matches the load_skill tool, not just the retired filestore.read', async () => {
    // Regression guard. The agent loads skills via the `load_skill` tool:
    //   {"skill":"/skills/<category>/<name>/SKILL.md"}
    // A predicate pinned to `filestore.read` can never match, so `skill_invoked`
    // stays 0 while `total_tool_spans` is non-zero -- meaning the "unavailable"
    // guard does NOT trip and the evaluator reports a confident false 0 for
    // every model. Verified against the scores cluster: over 7 days,
    // filestore.read = 0 spans, load_skill = 7,991 spans.
    const query = jest.fn().mockResolvedValue({
      columns: [{ name: 'total_tool_spans' }, { name: 'skill_invoked' }],
      values: [[2, 1]],
    });
    const evaluator = createPersonaMatrixSkillInvokedEvaluator({
      traceEsClient: { esql: { query } } as unknown as EsClient,
      log: buildLog(),
    });

    const result = await evaluator.evaluate(
      buildEvaluatorArgs(baseExample.metadata, '0af7651916cd43dd8448eb211c80319c')
    );

    const sent = query.mock.calls[0][0].query as string;
    expect(sent).toContain('load_skill');
    expect(result.score).toBe(1);
  });

  describe('skill predicate against load_skill arguments', () => {
    // Evaluates the LIKE patterns the evaluator emits against sample
    // `gen_ai.tool.call.arguments` strings, so the test goes red when the
    // predicate stops matching rather than asserting on query text.
    const likeToRegExp = (pattern: string) =>
      new RegExp(
        `^${pattern
          .split('*')
          .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
          .join('[\\s\\S]*')}$`
      );

    const buildMatcher = async (metadata: PersonaMatrixExample['metadata']) => {
      const query = jest.fn().mockResolvedValue({
        columns: [{ name: 'total_tool_spans' }, { name: 'skill_invoked' }],
        values: [[2, 1]],
      });
      const evaluator = createPersonaMatrixSkillInvokedEvaluator({
        traceEsClient: { esql: { query } } as unknown as EsClient,
        log: buildLog(),
      });
      await evaluator.evaluate(buildEvaluatorArgs(metadata, '0af7651916cd43dd8448eb211c80319c'));
      const sent = query.mock.calls[0][0].query as string;
      const patterns = [...sent.matchAll(/arguments LIKE "((?:[^"\\]|\\.)*)"/g)].map((m) =>
        likeToRegExp(m[1].replace(/\\(.)/g, '$1'))
      );
      expect(patterns.length).toBeGreaterThan(0);
      return (args: string) => patterns.some((re) => re.test(args));
    };

    const metadata = {
      ...baseExample.metadata,
      expectedSkill: 'alert-analysis',
      allowSkills: ['threat-hunting'],
    };

    it('matches a bare-id load_skill argument', async () => {
      const matches = await buildMatcher(metadata);
      expect(matches('{"skill":"alert-analysis"}')).toBe(true);
      expect(matches('{"skill":"threat-hunting"}')).toBe(true);
    });

    it('still matches the legacy SKILL.md path argument', async () => {
      const matches = await buildMatcher(metadata);
      expect(matches('{"skill":"/skills/security/alert-analysis/SKILL.md"}')).toBe(true);
    });

    it('does not match another skill or one that only shares a prefix', async () => {
      const matches = await buildMatcher(metadata);
      expect(matches('{"skill":"workflow-authoring"}')).toBe(false);
      expect(matches('{"skill":"alert-analysis-v2"}')).toBe(false);
      expect(matches('{"skill":"/skills/security/workflow-authoring/SKILL.md"}')).toBe(false);
    });
  });
});

describe('task output shape', () => {
  it('the real converse answer is reachable at messages[last].message', () => {
    // Regression guard for blocker #2: the shared correctness/groundedness
    // evaluators read output.messages[output.messages.length - 1].message.
    // This suite must never store the answer only under `response`.
    const taskOutput: TaskOutput = {
      messages: [{ message: 'the real answer' }],
      steps: [],
      errors: [],
      traceId: 'trace-1',
    };
    const messages = (taskOutput as { messages?: Array<{ message?: string }> }).messages ?? [];
    const latestMessage = messages[messages.length - 1]?.message;
    expect(latestMessage).toBe('the real answer');
  });

  it('forwards messageSource so a fallback answer is distinguishable from a real final turn', async () => {
    // chat_client falls back to the last non-empty reasoning/output step when a
    // model ends its turn on a tool call, and tags which one it used via
    // `messageSource`. If the task drops that tag, every stored cell looks like
    // a genuine closing answer and mid-run narration ("I will now preview the
    // detection rule...") is scored as if it were the model's final response.
    const log = buildLog();
    let capturedTask: ((example: unknown) => Promise<unknown>) | undefined;

    const evaluateDataset = createEvaluatePersonaMatrixDataset({
      chatClient: {
        query: jest.fn().mockResolvedValue({
          messages: [{ message: 'I will now preview the detection rule.' }],
          messageSource: 'last_assistant_step',
          steps: [],
          errors: [],
          traceId: 'trace-1',
        }),
      } as unknown as PersonaMatrixChatClient,
      evaluators: {
        traceBasedEvaluators: {
          inputTokens: { name: 'inputTokens' },
          outputTokens: { name: 'outputTokens' },
          toolCalls: { name: 'toolCalls' },
          latency: { name: 'latency' },
        },
        criteria: () => ({ evaluate: jest.fn().mockResolvedValue({ score: 1 }) }),
        correctnessAnalysis: () => ({ evaluate: jest.fn().mockResolvedValue({ metadata: {} }) }),
        groundednessAnalysis: () => ({ evaluate: jest.fn().mockResolvedValue({ metadata: {} }) }),
      } as unknown as DefaultEvaluators,
      executorClient: {
        runExperiment: jest.fn(async (params: { task: unknown }) => {
          capturedTask = params.task as (example: unknown) => Promise<unknown>;
        }),
      } as unknown as EvalsExecutorClient,
      traceEsClient: {} as EsClient,
      log,
    });

    await evaluateDataset({
      dataset: { name: 'ds', description: 'desc', examples: [baseExample] },
    });

    const output = (await capturedTask!(toDatasetExample(baseExample))) as Record<string, unknown>;

    expect(output.messageSource).toBe('last_assistant_step');
  });
});

describe('task judges and the last-assistant-step fallback', () => {
  const runTask = async (
    response: Record<string, unknown>,
    { criteriaRejects = false }: { criteriaRejects?: boolean } = {}
  ) => {
    const correctnessEvaluate = jest.fn().mockResolvedValue({ metadata: { verdict: 'ok' } });
    const groundednessEvaluate = jest.fn().mockResolvedValue({ metadata: { verdict: 'ok' } });
    const criteriaEvaluate = criteriaRejects
      ? jest.fn().mockRejectedValue(new Error('criteria judge down'))
      : jest
          .fn()
          .mockResolvedValue({ score: 0.75, label: null, explanation: 'criteria-explanation' });
    let capturedTask: ((example: unknown) => Promise<unknown>) | undefined;
    let capturedEvaluators: Evaluator[] = [];
    const evaluateDataset = createEvaluatePersonaMatrixDataset({
      chatClient: {
        query: jest
          .fn()
          .mockResolvedValue({ steps: [], errors: [], traceId: 'trace-1', ...response }),
      } as unknown as PersonaMatrixChatClient,
      evaluators: {
        traceBasedEvaluators: {
          inputTokens: { name: 'inputTokens' },
          outputTokens: { name: 'outputTokens' },
          toolCalls: { name: 'toolCalls' },
          latency: { name: 'latency' },
        },
        criteria: () => ({
          name: 'criteria',
          kind: 'LLM',
          direction: 'maximize',
          evaluate: criteriaEvaluate,
        }),
        correctnessAnalysis: () => ({ evaluate: correctnessEvaluate }),
        groundednessAnalysis: () => ({ evaluate: groundednessEvaluate }),
      } as unknown as DefaultEvaluators,
      executorClient: {
        runExperiment: jest.fn(async (params: { task: unknown }, evaluators: Evaluator[]) => {
          capturedTask = params.task as (example: unknown) => Promise<unknown>;
          capturedEvaluators = evaluators;
        }),
      } as unknown as EvalsExecutorClient,
      traceEsClient: {} as EsClient,
      log: buildLog(),
    });
    await evaluateDataset({
      dataset: { name: 'ds', description: 'desc', examples: [baseExample] },
    });
    const output = (await capturedTask!(toDatasetExample(baseExample))) as Record<string, unknown>;
    return {
      output,
      correctnessEvaluate,
      groundednessEvaluate,
      criteriaEvaluate,
      capturedEvaluators,
    };
  };

  const judgedAnswer = (evaluate: jest.Mock) => {
    const { output } = evaluate.mock.calls[0][0] as {
      output: { messages: Array<{ message: string }> };
    };
    return output.messages[output.messages.length - 1]?.message;
  };

  it('does not let the judges grade fallback narration as the final answer', async () => {
    const { output, correctnessEvaluate, groundednessEvaluate } = await runTask({
      messages: [{ message: 'I will now preview the detection rule.' }],
      messageSource: 'last_assistant_step',
    });
    expect(judgedAnswer(correctnessEvaluate)).toBe('');
    expect(judgedAnswer(groundednessEvaluate)).toBe('');
    // The narration stays on the stored output for the trace card.
    expect((output.messages as Array<{ message: string }>)[0].message).toBe(
      'I will now preview the detection rule.'
    );
  });

  it('judges the rendered artifact when a fallback run ends on one', async () => {
    const { correctnessEvaluate } = await runTask({
      messages: [{ message: 'Created it. <render_attachment id="att-9" version="1"/>' }],
      messageSource: 'last_assistant_step',
      steps: [
        {
          type: 'tool_call',
          tool_id: 'security.create_detection_rule',
          results: [
            {
              data: {
                success: true,
                attachment_id: 'att-9',
                rule: { name: 'chrysalis-beacon', query: 'process.name: curl' },
              },
            },
          ],
        },
      ],
    });
    const answer = judgedAnswer(correctnessEvaluate);
    expect(answer).toContain('chrysalis-beacon');
    expect(answer).not.toContain('preview');
  });

  it('runs the criteria judge on the judged submission, not the fallback narration', async () => {
    const { output, criteriaEvaluate, capturedEvaluators } = await runTask({
      messages: [{ message: 'I will now preview the detection rule.' }],
      messageSource: 'last_assistant_step',
    });
    expect(judgedAnswer(criteriaEvaluate)).toBe('');
    expect((output.messages as Array<{ message: string }>)[0].message).toBe(
      'I will now preview the detection rule.'
    );

    // The registered criteria evaluator reads the precomputed result back and
    // never calls the judge itself.
    const criteria = capturedEvaluators.find(({ name }) => name === 'criteria');
    expect(criteria).toBeDefined();
    const result = await criteria!.evaluate({
      input: {},
      expected: {},
      output: output as TaskOutput,
      metadata: {},
    });
    expect(result).toMatchObject({ score: 0.75, explanation: 'criteria-explanation' });
    expect(criteriaEvaluate).toHaveBeenCalledTimes(1);
  });

  it('reports criteria as unavailable when the criteria judge fails', async () => {
    const { output, criteriaEvaluate, capturedEvaluators } = await runTask(
      { messages: [{ message: 'the real answer' }], messageSource: 'response' },
      { criteriaRejects: true }
    );
    expect(criteriaEvaluate).toHaveBeenCalledTimes(1);
    expect((output.messages as Array<{ message: string }>)[0].message).toBe('the real answer');
    const criteria = capturedEvaluators.find(({ name }) => name === 'criteria');
    const result = await criteria!.evaluate({
      input: {},
      expected: {},
      output: output as TaskOutput,
      metadata: {},
    });
    expect(result).toMatchObject({ score: null, label: 'unavailable' });
  });

  it('forwards workflowAttachments and judges a rendered workflow on its attachment YAML', async () => {
    const workflowAttachments = [{ id: 'wf-7', version: 1, yaml: 'name: chrysalis-workflow' }];
    const { output, correctnessEvaluate } = await runTask({
      messages: [{ message: 'Done. <render_attachment id="wf-7" version="1"/>' }],
      messageSource: 'last_assistant_step',
      workflowAttachments,
      steps: [
        {
          type: 'tool_call',
          tool_id: 'platform.core.generate_workflow',
          params: { query: 'post to Slack' },
          results: [{ data: { success: true, attachment_id: 'wf-7', attachment_version: 1 } }],
        },
      ],
    });
    expect(output.workflowAttachments).toEqual(workflowAttachments);
    expect(judgedAnswer(correctnessEvaluate)).toBe('name: chrysalis-workflow');
  });

  const createRuleStep = (attachmentId: string) => ({
    type: 'tool_call',
    tool_id: 'security.create_detection_rule',
    params: {},
    results: [
      {
        data: {
          success: true,
          attachment_id: attachmentId,
          rule: { name: 'chrysalis-beacon', severity: 'low' },
        },
      },
    ],
  });
  const updateRuleStep = (attachmentId: string, toolId = 'attachments.update') => ({
    type: 'tool_call',
    tool_id: toolId,
    params: {
      attachment_id: attachmentId,
      data: { text: JSON.stringify({ name: 'chrysalis-beacon', severity: 'high' }) },
    },
    results: [
      {
        data: {
          attachment_id: attachmentId,
          type: 'security.rule',
          previous_version: 1,
          version: 2,
          version_created: true,
        },
      },
    ],
  });

  it('judges the updated rule when the render tag shows the latest version', async () => {
    const { correctnessEvaluate } = await runTask({
      messages: [{ message: 'Updated. <render_attachment id="att-r"/>' }],
      messageSource: 'last_assistant_step',
      steps: [createRuleStep('att-r'), updateRuleStep('att-r')],
    });
    const answer = judgedAnswer(correctnessEvaluate);
    expect(answer).toContain('"severity":"high"');
    expect(answer).not.toContain('"severity":"low"');
  });

  it('judges the version the render tag pinned', async () => {
    const pinnedFirst = await runTask({
      messages: [{ message: 'Draft. <render_attachment id="att-r" version="1"/>' }],
      messageSource: 'last_assistant_step',
      steps: [createRuleStep('att-r'), updateRuleStep('att-r', 'attachment_update')],
    });
    expect(judgedAnswer(pinnedFirst.correctnessEvaluate)).toContain('"severity":"low"');

    const pinnedSecond = await runTask({
      messages: [{ message: 'Final. <render_attachment version="2" id="att-r"/>' }],
      messageSource: 'last_assistant_step',
      steps: [createRuleStep('att-r'), updateRuleStep('att-r', 'attachment_update')],
    });
    expect(judgedAnswer(pinnedSecond.correctnessEvaluate)).toContain('"severity":"high"');
  });

  it('ignores a failed attachment update', async () => {
    const failedUpdate = {
      ...updateRuleStep('att-r'),
      results: [{ type: 'error', data: { message: 'Attachment update failed' } }],
    };
    const { correctnessEvaluate } = await runTask({
      messages: [{ message: 'Updated. <render_attachment id="att-r"/>' }],
      messageSource: 'last_assistant_step',
      steps: [createRuleStep('att-r'), failedUpdate],
    });
    const answer = judgedAnswer(correctnessEvaluate);
    expect(answer).toContain('"severity":"low"');
    expect(answer).not.toContain('"severity":"high"');
  });

  it('resolves a pinned version across query rewrites of the same attachment', async () => {
    const rewrite = (version: number, query: string) => ({
      type: 'tool_call',
      tool_id: 'security.create_detection_rule',
      params: { attachment_id: 'att-r' },
      results: [
        {
          data: {
            success: true,
            attachment_id: 'att-r',
            version,
            rule: { name: 'chrysalis-beacon', query },
          },
        },
      ],
    });
    const { correctnessEvaluate } = await runTask({
      messages: [{ message: 'First draft. <render_attachment id="att-r" version="1"/>' }],
      messageSource: 'last_assistant_step',
      steps: [rewrite(1, 'first-query'), rewrite(2, 'rewritten-query')],
    });
    const answer = judgedAnswer(correctnessEvaluate);
    expect(answer).toContain('first-query');
    expect(answer).not.toContain('rewritten-query');
  });

  it('sends the criteria judge no fallback narration anywhere in its payload', async () => {
    const { criteriaEvaluate } = await runTask({
      messages: [{ message: 'I will now preview the detection rule.' }],
      messageSource: 'last_assistant_step',
      workflowAttachments: [{ id: 'wf-x', version: 1, yaml: 'name: leftover-draft' }],
      steps: [
        { type: 'reasoning', reasoning: 'I will now preview the detection rule.' },
        {
          type: 'tool_call',
          tool_id: 'security.run_rule_preview',
          params: {},
          results: [{ data: { hits: 3 } }],
        },
      ],
    });
    const payload = JSON.stringify(criteriaEvaluate.mock.calls[0][0].output);
    expect(payload).not.toContain('preview the detection rule');
    expect(payload).not.toContain('leftover-draft');
    expect(payload).not.toContain('last_assistant_step');
    expect(payload).toContain('security.run_rule_preview');
  });

  it('still judges a real closing answer', async () => {
    const { correctnessEvaluate, groundednessEvaluate } = await runTask({
      messages: [{ message: 'the real answer' }],
      messageSource: 'response',
    });
    expect(judgedAnswer(correctnessEvaluate)).toBe('the real answer');
    expect(judgedAnswer(groundednessEvaluate)).toBe('the real answer');
  });
});

describe('task judge failure isolation', () => {
  it('keeps the trajectory and degrades qualitative scores when a judge call rejects', async () => {
    // Regression guard for whole-suite aborts: a single judge
    // call failing (e.g. inference 500 toolValidationError) must not throw out
    // of the task and take down all remaining examples.
    const log = buildLog();
    let capturedTask: ((example: unknown) => Promise<unknown>) | undefined;

    const evaluateDataset = createEvaluatePersonaMatrixDataset({
      chatClient: {
        query: jest.fn().mockResolvedValue({
          messages: [{ message: 'the real answer' }],
          steps: [],
          errors: [],
          traceId: 'trace-1',
        }),
      } as unknown as PersonaMatrixChatClient,
      evaluators: {
        traceBasedEvaluators: {
          inputTokens: { name: 'inputTokens' },
          outputTokens: { name: 'outputTokens' },
          toolCalls: { name: 'toolCalls' },
          latency: { name: 'latency' },
        },
        criteria: () => ({ evaluate: jest.fn().mockResolvedValue({ score: 1 }) }),
        correctnessAnalysis: () => ({
          evaluate: jest.fn().mockRejectedValue(new Error('toolValidationError')),
        }),
        groundednessAnalysis: () => ({
          evaluate: jest.fn().mockResolvedValue({ metadata: { verdict: 'grounded' } }),
        }),
      } as unknown as DefaultEvaluators,
      executorClient: {
        runExperiment: jest.fn(async (params: { task: unknown }) => {
          capturedTask = params.task as (example: unknown) => Promise<unknown>;
        }),
      } as unknown as EvalsExecutorClient,
      traceEsClient: {} as EsClient,
      log,
    });

    await evaluateDataset({
      dataset: { name: 'ds', description: 'desc', examples: [baseExample] },
    });

    expect(capturedTask).toBeDefined();
    const output = (await capturedTask!(toDatasetExample(baseExample))) as Record<string, unknown>;

    // The failed judge degrades to an absent analysis (quantitative evaluators
    // then report "unavailable"); the successful judge and the agent's real
    // trajectory are preserved.
    expect(output.correctnessAnalysis).toBeUndefined();
    expect(output.groundednessAnalysis).toEqual({ verdict: 'grounded' });
    expect((output.messages as Array<{ message: string }>)[0].message).toBe('the real answer');
    expect(log.error).toHaveBeenCalledWith(expect.stringContaining('CorrectnessAnalysis failed'));
    expect((log.error as jest.Mock).mock.calls.flat().join(' ')).toContain('toolValidationError');
  });
});
