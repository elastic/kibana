/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  attachmentTools,
  platformCoreCasesTools,
  platformCoreTools,
} from '@kbn/agent-builder-common';
import { PERSONA_MATRIX_EXAMPLES } from './persona_matrix_prompts';
import {
  PERSONA_MATRIX_TOOL_IDS,
  PERSONA_MATRIX_PARITY_TOOL_IDS,
} from '../fixtures/persona_matrix_tools_seed';

const byId = (id: string) => {
  const example = PERSONA_MATRIX_EXAMPLES.find((e) => e.id === id);
  if (!example) {
    throw new Error(`missing example ${id}`);
  }
  return example;
};

describe('PERSONA_MATRIX_EXAMPLES prompt/annotation parity', () => {
  // Each dataset example is its own conversation (PersonaMatrixChatClient.query sends no
  // conversation id), so a question that points back at an earlier incident needs an attachment.
  it('detection-rule-edit-c supplies the confirmed-threat context through an attachment', () => {
    const { input } = byId('detection-rule-edit-c');
    expect(input.question).toContain('this threat');
    expect(input.attachment).toBeDefined();
    expect(input.attachment).toContain('srv-win-defend-01');
    expect(input.attachment).toContain('BluetoothService.exe');
    expect(input.attachment).toContain('log.dll');
    expect(input.attachment).toContain(
      '275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f'
    );
    expect(input.attachment).toContain('C:\\Users\\Public\\');
  });

  describe.each([
    ['multi-step-a', ['virustotal_lookup', 'on_call_lookup']],
    ['multi-step-b', ['virustotal_lookup', 'on_call_lookup']],
    ['multi-step-c', ['on_call_lookup']],
  ])('%s', (id, requestedTools) => {
    it('annotates every requested seeded tool in expectedTools', () => {
      expect(byId(id).metadata.expectedTools).toEqual(expect.arrayContaining(requestedTools));
    });

    it('describes the requested on-call and Slack steps in the reference', () => {
      const { reference } = byId(id).output;
      expect(reference).toContain('on_call_lookup');
      expect(reference).toContain('Slack');
    });
  });

  it.each(['multi-step-a', 'multi-step-b'])('%s reference covers VirusTotal verification', (id) => {
    expect(byId(id).output.reference).toContain('virustotal_lookup');
  });

  // Exact-match assertions on the question wording: reference/expectedTools
  // fixes must never alter the prompts (parity with the published matrix).
  it.each([
    [
      'detection-rule-edit-c',
      "Now that we've confirmed this threat, help me close the detection gap - create a rule " +
        'so we catch this automatically next time, and ground it in the relevant Security Labs research.',
    ],
    [
      'multi-step-a',
      'Analyze this alert. If it involves a file hash, verify the hash on VirusTotal. ' +
        'Then check who is on call, and create a Slack channel with the on-call analyst that includes ' +
        'your findings from this alert (verdict, IOCs, and the on-call owner). ' +
        'Walk me through each step as you go.',
    ],
    [
      'multi-step-b',
      "There's a confirmed Chrysalis incident on srv-win-defend-01. Run the full response: " +
        'verify the loader hash 275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f ' +
        'on VirusTotal, check the on-call schedule, open a critical Security case, then spin up a ' +
        'Slack incident channel with the on-call responder and post the case summary and top IOCs. ' +
        'Report what you did at each step.',
    ],
  ] as const)(
    '%s question wording is byte-identical to the published matrix prompt',
    (id, question) => {
      expect(byId(id).input.question).toBe(question);
    }
  );

  // The default SEED_PROFILE is `minimal`, which seeds only PERSONA_MATRIX_TOOL_IDS, so an
  // example may only annotate those plus registered builtins; parity-only shims would be
  // impossible to satisfy under the default run.
  it('every expectedTools entry is a minimal-profile seeded tool or a registered builtin tool id', () => {
    const available = new Set<string>([...PERSONA_MATRIX_TOOL_IDS, ...BUILTIN_TOOL_IDS]);
    const unavailable = PERSONA_MATRIX_EXAMPLES.flatMap((example) =>
      (example.metadata.expectedTools ?? [])
        .filter((tool) => !available.has(tool))
        .map((tool) => `${example.id}: ${tool}`)
    );
    expect(unavailable).toEqual([]);
  });

  it('no example annotates a parity-only seeded tool', () => {
    const parityOnly = new Set<string>(PERSONA_MATRIX_PARITY_TOOL_IDS);
    const used = PERSONA_MATRIX_EXAMPLES.flatMap((example) =>
      (example.metadata.expectedTools ?? [])
        .filter((tool) => parityOnly.has(tool))
        .map((tool) => `${example.id}: ${tool}`)
    );
    expect(used).toEqual([]);
  });

  describe('references only demand what the seeded environment can do', () => {
    const ref = (id: string) => byId(id).output.reference;

    // No Slack tool/connector is seeded: the reference must score the honest fallback.
    it.each(['multi-step-a', 'multi-step-b'])('%s scores the no-Slack-tool fallback', (id) => {
      expect(ref(id)).toMatch(/if none is exposed, states that Slack is unavailable/i);
      expect(ref(id)).toMatch(/attempts the Slack step/i);
      expect(ref(id)).not.toMatch(/then creates a Slack|and creates a Slack channel/i);
    });

    // Opening a case needs the case-management tool; platform.core.cases is the read-only search.
    it('multi-step-b annotates and describes the case-management tool', () => {
      expect(byId('multi-step-b').metadata.expectedTools).toContain(platformCoreCasesTools.manage);
      expect(ref('multi-step-b')).toContain('via the case-management tool');
    });

    // Security Labs content is never installed: the tool tells the agent to stop.
    it('detection-rule-edit-c scores the no-Security-Labs fallback', () => {
      expect(ref('detection-rule-edit-c')).toMatch(/If no Security Labs research is/);
      expect(ref('detection-rule-edit-c')).toMatch(/without fabricating/);
      expect(ref('detection-rule-edit-c')).toMatch(
        /stops as the tool instructs|makes no further tool calls/
      );
      expect(ref('detection-rule-edit-c')).not.toMatch(
        /calls security\.create_detection_rule with a rule grounded in .*attachment/
      );
      expect(ref('detection-rule-edit-c')).toMatch(/GenAI Settings/);
      expect(byId('detection-rule-edit-c').metadata.expectedTools).toEqual([
        'security.security_labs_search',
      ]);
    });
  });
});

// Registered builtin tool ids. The platform.core.*, platform.core.cases.* and attachments.*
// ids come from agent-builder-common so they cannot drift; plugin-owned ids cannot be
// imported here and stay hardcoded.
const BUILTIN_TOOL_IDS: readonly string[] = [
  ...Object.values(platformCoreTools),
  ...Object.values(platformCoreCasesTools),
  ...Object.values(attachmentTools),
  'platform.workflows.validate_workflow',
  'security.alerts',
  'security.security_labs_search',
  'security.create_detection_rule',
  'security.get_entity',
  'security.entity_risk_score',
  'security.search_entities',
];
