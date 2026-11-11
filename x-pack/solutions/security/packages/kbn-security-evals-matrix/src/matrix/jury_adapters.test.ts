/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import {
  selectJury,
  checkJuryCoverage,
  personaMatrixJury,
  attackDiscoveryJury,
  JURY_ADAPTERS,
} from './jury_adapters';
import type { ReplayCell } from './replay_plan';

const cell = (overrides: Partial<ReplayCell> = {}): ReplayCell => ({
  executionId: 'exec-1',
  exampleId: '0',
  modelId: 'model-a',
  question: 'What happened?',
  expected: 'A reference answer.',
  agentResponse: 'An agent answer.',
  steps: [],
  recordedAt: '2026-09-08T00:00:00.000Z',
  ...overrides,
});

describe('selectJury', () => {
  it('resolves a jury by suite id', () => {
    expect(selectJury('attack-discovery-agent-builder')?.name).toBe('attack-discovery');
    expect(selectJury('security-persona-matrix')?.name).toBe('persona-matrix');
  });

  it('resolves a jury by adapter name', () => {
    expect(selectJury('attack-discovery')?.name).toBe('attack-discovery');
    expect(selectJury('persona-matrix')?.name).toBe('persona-matrix');
  });

  it('returns undefined for an unregistered suite rather than defaulting', () => {
    // Defaulting to the persona jury is precisely the bug this registry fixes:
    // it produced Factuality/Relevance verdicts for an AD replay.
    expect(selectJury('security-automatic-migrations')).toBeUndefined();
    expect(selectJury('totally-unknown-suite')).toBeUndefined();
  });
});

describe('personaMatrixJury.toArgs', () => {
  it('builds args from a complete cell', () => {
    const args = personaMatrixJury.toArgs(cell());
    expect(args).not.toBeNull();
    expect(args!.input).toEqual({ question: 'What happened?' });
    expect(args!.expected).toEqual({ expected: 'A reference answer.' });
  });

  it('rejects a cell with no agent response', () => {
    expect(personaMatrixJury.toArgs(cell({ agentResponse: '' }))).toBeNull();
  });

  it('rejects a cell with no prose reference', () => {
    expect(personaMatrixJury.toArgs(cell({ expected: '' }))).toBeNull();
  });

  // The live run does not grade `last_assistant_step` narration as the final
  // answer (evaluate_dataset.ts); the replay must grade the same submission
  // rather than restore credit for the narration.
  it('blanks a last_assistant_step cell with no artifact instead of grading its narration', () => {
    const args = personaMatrixJury.toArgs(
      cell({
        agentResponse: 'I will now preview the detection rule.',
        taskOutput: { messageSource: 'last_assistant_step' },
      })
    );
    expect(args).not.toBeNull();
    expect(args!.output.messages).toEqual([{ message: '' }]);
  });

  it('judges a last_assistant_step cell on its rendered rule artifact', () => {
    const args = personaMatrixJury.toArgs(
      cell({
        agentResponse: 'I will now preview the detection rule.',
        taskOutput: {
          messageSource: 'last_assistant_step',
          messages: [{ message: 'Done. <render_attachment id="att-1" version="1"/>' }],
          steps: [
            {
              type: 'tool_call',
              tool_id: 'security.create_detection_rule',
              results: [
                {
                  data: {
                    success: true,
                    attachment_id: 'att-1',
                    rule: { name: 'beacon-rule', query: 'process.name: curl' },
                  },
                },
              ],
            },
          ],
        },
      })
    );
    const answer = (args!.output.messages as Array<{ message: string }>)[0].message;
    expect(answer).toContain('beacon-rule');
    expect(answer).not.toContain('preview');
  });

  it('judges a last_assistant_step cell on its delivered workflow YAML', () => {
    const args = personaMatrixJury.toArgs(
      cell({
        agentResponse: 'Generating the workflow now.',
        taskOutput: {
          messageSource: 'last_assistant_step',
          messages: [{ message: '<render_attachment id="att-2" version="1"/>' }],
          steps: [
            {
              type: 'tool_call',
              tool_id: 'platform.core.generate_workflow',
              results: [
                { data: { success: true, attachment_id: 'att-2', yaml: 'workflow: steps: []' } },
              ],
            },
          ],
        },
      })
    );
    expect((args!.output.messages as Array<{ message: string }>)[0].message).toBe(
      'workflow: steps: []'
    );
  });

  const fallbackAnswer = (taskOutput: Record<string, unknown>) =>
    (
      personaMatrixJury.toArgs(
        cell({
          agentResponse: 'narration',
          taskOutput: { messageSource: 'last_assistant_step', ...taskOutput },
        })
      )!.output.messages as Array<{ message: string }>
    )[0].message;

  const generateStep = (attachmentId: string) => ({
    type: 'tool_call',
    tool_id: 'platform.core.generate_workflow',
    results: [{ data: { success: true, attachment_id: attachmentId } }],
  });

  it('judges the rendered workflow attachment, not the last one', () => {
    expect(
      fallbackAnswer({
        messages: [{ message: 'Done. <render_attachment version="1" id="wf-a"/>' }],
        steps: [generateStep('wf-a')],
        workflowAttachments: [
          { id: 'wf-a', version: 1, yaml: 'rendered-yaml' },
          { id: 'wf-b', version: 1, yaml: 'leftover-draft-yaml' },
        ],
      })
    ).toBe('rendered-yaml');
  });

  it('falls back to the last validate_workflow yaml when no attachment or generated yaml exists', () => {
    expect(
      fallbackAnswer({
        messages: [{ message: '<render_attachment id="wf-a" version="1"/>' }],
        steps: [
          generateStep('wf-a'),
          {
            type: 'tool_call',
            tool_id: 'platform.workflows.validate_workflow',
            params: { yaml: 'draft-yaml' },
            results: [],
          },
          {
            type: 'tool_call',
            tool_id: 'platform.workflows.validate_workflow',
            params: { yaml: 'final-yaml' },
            results: [],
          },
        ],
      })
    ).toBe('final-yaml');
  });

  const createRuleStep = {
    type: 'tool_call',
    tool_id: 'security.create_detection_rule',
    params: {},
    results: [
      { data: { success: true, attachment_id: 'att-r', rule: { name: 'r', severity: 'low' } } },
    ],
  };
  const updateRuleStep = {
    type: 'tool_call',
    tool_id: 'attachments.update',
    params: {
      attachment_id: 'att-r',
      data: { text: JSON.stringify({ name: 'r', severity: 'high' }) },
    },
    results: [{ data: { attachment_id: 'att-r', previous_version: 1, version: 2 } }],
  };

  it('judges the rule as updated after creation when the render tag shows the latest', () => {
    const answer = fallbackAnswer({
      messages: [{ message: '<render_attachment id="att-r"/>' }],
      steps: [createRuleStep, updateRuleStep],
    });
    expect(answer).toContain('"severity":"high"');
  });

  it('judges the rule version the render tag pinned', () => {
    const answer = fallbackAnswer({
      messages: [{ message: '<render_attachment id="att-r" version="1"/>' }],
      steps: [createRuleStep, updateRuleStep],
    });
    expect(answer).toContain('"severity":"low"');
  });

  it('ignores a failed attachment update', () => {
    const answer = fallbackAnswer({
      messages: [{ message: '<render_attachment id="att-r"/>' }],
      steps: [
        createRuleStep,
        { ...updateRuleStep, results: [{ type: 'error', data: { message: 'update failed' } }] },
      ],
    });
    expect(answer).toContain('"severity":"low"');
  });

  it('resolves a pinned version across query rewrites of the same attachment', () => {
    const rewrite = (version: number, query: string) => ({
      type: 'tool_call',
      tool_id: 'security.create_detection_rule',
      params: { attachment_id: 'att-r' },
      results: [{ data: { success: true, attachment_id: 'att-r', version, rule: { query } } }],
    });
    const answer = fallbackAnswer({
      messages: [{ message: '<render_attachment id="att-r" version="1"/>' }],
      steps: [rewrite(1, 'first-query'), rewrite(2, 'rewritten-query')],
    });
    expect(answer).toContain('first-query');
    expect(answer).not.toContain('rewritten-query');
  });

  it('drops the narration step from a fallback cell, keeping tool calls', () => {
    const args = personaMatrixJury.toArgs(
      cell({
        agentResponse: 'narration',
        taskOutput: { messageSource: 'last_assistant_step' },
        steps: [
          { type: 'reasoning', reasoning: 'narration' },
          { type: 'tool_call', tool_id: 'security.run_rule_preview', results: [] },
        ],
      })
    );
    expect(args!.output.steps).toEqual([
      { type: 'tool_call', tool_id: 'security.run_rule_preview', results: [] },
    ]);
  });

  it('still grades a normal closing answer in full', () => {
    const args = personaMatrixJury.toArgs(cell({ taskOutput: { messageSource: 'response' } }));
    expect(args!.output.messages).toEqual([{ message: 'An agent answer.' }]);
  });
});

describe('attackDiscoveryJury.toArgs', () => {
  const adCell = (output: unknown, expectedStructured: unknown = { criteria: ['c1'] }) =>
    cell({
      // AD grades the structured payload, not the transcript, so a cell with
      // no final message is still replayable.
      agentResponse: '',
      taskOutput: output,
      expectedStructured,
    });

  it('grades insights even when the transcript has no final message', () => {
    const args = attackDiscoveryJury.toArgs(
      adCell({ insights: [{ title: 'Suspicious curl', alertIds: ['a1'] }] })
    );
    expect(args).not.toBeNull();
    expect((args!.output as { insights: unknown[] }).insights).toHaveLength(1);
  });

  it('rejects a cell whose insights are empty', () => {
    expect(attackDiscoveryJury.toArgs(adCell({ insights: [] }))).toBeNull();
  });

  it('rejects a cell with no ground truth to grade against', () => {
    expect(
      attackDiscoveryJury.toArgs(adCell({ insights: [{ title: 't' }] }, { criteria: [] }))
    ).toBeNull();
  });
});

describe('attackDiscoveryJury.criteriaFor', () => {
  const args = {
    input: { question: 'Run attack discovery' },
    output: { insights: [{ title: 'Suspicious curl', alertIds: ['a1'] }], errors: [] },
    expected: { criteria: ['c1', 'c2'], attackDiscoveries: [{ title: 'ref', alertIds: ['a1'] }] },
    metadata: {},
  };

  it('emits both Criteria and Rubric invocations', () => {
    const specs = attackDiscoveryJury.criteriaFor!(args);
    expect(specs.map((s) => s.name)).toEqual(['Criteria', 'Rubric']);
  });

  it('passes the suite criteria through verbatim', () => {
    const specs = attackDiscoveryJury.criteriaFor!(args);
    expect(specs.find((s) => s.name === 'Criteria')!.criteria).toEqual(['c1', 'c2']);
  });

  it('mirrors the suite Rubric evaluator: one collapsed 5-of-7 Y/N criterion', () => {
    // The published AD Rubric column is produced by the suite's evaluator, which
    // sends a single criterion ending "at least 5 of the 7 ... Y or N". A rejudge
    // that sent 7 separate criteria would grade partial credit against a binary
    // column and not be comparable with it.
    const rubric = attackDiscoveryJury.criteriaFor!(args).find(
      (s) => s.name === 'Rubric'
    )!.criteria;

    expect(rubric).toHaveLength(1);
    expect(rubric[0]).toContain('using these 7 rubric items');
    expect(rubric[0]).toContain('alertIds');
    expect(rubric[0]).toContain('MITRE');
    expect(rubric[0]).toContain('at least 5 of the 7 rubric items');
    expect(rubric[0]).toContain('end with a single character: Y or N');
    expect(rubric[0]).toContain('Reference:');
  });

  it('keeps the fallback wording identical to the suite evaluator source', () => {
    const suiteSource = Fs.readFileSync(
      Path.resolve(
        __dirname,
        '../../../kbn-evals-suite-attack-discovery-agent-builder/src/evaluators/attack_discovery_rubric_evaluator.ts'
      ),
      'utf8'
    );
    const [criterion] = attackDiscoveryJury.criteriaFor!(args).find(
      (s) => s.name === 'Rubric'
    )!.criteria;
    // The interpolated reference is multi-line JSON; compare only the fixed wording.
    const staticLines = criterion
      .split('\n')
      .filter((line) => /^(Evaluate |\d\. |Score the submission)/.test(line));
    expect(staticLines).toHaveLength(9);

    for (const line of staticLines) {
      expect(suiteSource).toContain(line);
    }
  });

  it('prefers rubric items injected by the caller over its own copy', () => {
    // The suite owns the rubric; this adapter keeps a fallback. When the CLI
    // supplies the suite's list, a rubric change in the suite must reach the
    // replay rather than being shadowed by the stale local copy.
    const specs = attackDiscoveryJury.criteriaFor!({
      ...args,
      metadata: { ...args.metadata, rubricCriteria: ['only item A', 'only item B'] },
    } as typeof args);
    const rubric = specs.find((s) => s.name === 'Rubric')!.criteria;

    expect(rubric).toHaveLength(2);
    expect(rubric[0]).toContain('only item A');
    expect(rubric.every((c) => c.includes('Reference:'))).toBe(true);
  });

  it('omits the Rubric invocation when there is no reference discovery', () => {
    const specs = attackDiscoveryJury.criteriaFor!({
      ...args,
      expected: { criteria: ['c1'], attackDiscoveries: [] },
    });
    expect(specs.map((s) => s.name)).toEqual(['Criteria']);
  });
});

describe('checkJuryCoverage', () => {
  it('accepts results carrying the jury evaluators', () => {
    const result = checkJuryCoverage(attackDiscoveryJury, [
      { name: 'Criteria', score: 1 },
      { name: 'Rubric', score: 0.5 },
    ]);
    expect(result.ok).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it('rejects persona verdicts returned for an AD replay', () => {
    // The exact failure that produced 253 unusable cells.
    const result = checkJuryCoverage(attackDiscoveryJury, [
      { name: 'Factuality', score: 0 },
      { name: 'Relevance', score: 0.5 },
    ]);
    expect(result.ok).toBe(false);
    expect(result.unexpected).toEqual(['Factuality', 'Relevance']);
  });

  it('reports a partially-covered jury without failing it', () => {
    const result = checkJuryCoverage(attackDiscoveryJury, [{ name: 'Criteria', score: 1 }]);
    expect(result.ok).toBe(true);
    expect(result.missing).toEqual(['Rubric']);
  });

  it('does not accept a run that produced no verdicts at all', () => {
    // Failure mode 2: the jury resolves without throwing but grades nothing.
    // The run exits 0 with no failures, so only an assertion on the evaluator
    // names present distinguishes it from a successful rejudge.
    const result = checkJuryCoverage(attackDiscoveryJury, []);
    expect(result.ok).toBe(false);
    expect(result.missing).toEqual(['Criteria', 'Rubric']);
  });

  it('does not accept verdicts whose scores are all null', () => {
    // A judge that answers but cannot parse its own output yields named
    // evaluators carrying no score. Counting the name as coverage would let an
    // ungraded column read as refreshed.
    const result = checkJuryCoverage(attackDiscoveryJury, [
      { name: 'Criteria', score: null },
      { name: 'Rubric', score: null },
    ]);
    expect(result.ok).toBe(false);
    expect(result.missing).toEqual(['Criteria', 'Rubric']);
  });
});

describe('JURY_ADAPTERS registry', () => {
  it('declares evaluator names for every jury', () => {
    for (const jury of JURY_ADAPTERS) {
      expect(jury.evaluatorNames.length).toBeGreaterThan(0);
    }
  });

  it('never maps one suite id to two juries', () => {
    const seen = new Set<string>();
    for (const jury of JURY_ADAPTERS) {
      for (const suiteId of jury.suiteIds) {
        expect(seen.has(suiteId)).toBe(false);
        seen.add(suiteId);
      }
    }
  });
});
