/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

  it('only annotates seeded or registered tools that the suite can actually provide', () => {
    const seeded = new Set<string>(PERSONA_MATRIX_TOOL_IDS);
    for (const id of ['multi-step-a', 'multi-step-b', 'multi-step-c']) {
      const custom = (byId(id).metadata.expectedTools ?? []).filter((tool) => !tool.includes('.'));
      for (const tool of custom) {
        expect(seeded.has(tool)).toBe(true);
      }
    }
  });

  // Byte-identical snapshots of the question wording: reference/expectedTools
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

  it('every expectedTools entry is a seeded suite tool or a registered builtin tool id', () => {
    const seeded = new Set<string>([...PERSONA_MATRIX_TOOL_IDS, ...PERSONA_MATRIX_PARITY_TOOL_IDS]);
    const unregistered = PERSONA_MATRIX_EXAMPLES.flatMap((example) =>
      (example.metadata.expectedTools ?? [])
        .filter((tool) => !seeded.has(tool) && !BUILTIN_TOOL_IDS.includes(tool as never))
        .map((tool) => `${example.id}: ${tool}`)
    );
    expect(unregistered).toEqual([]);
  });
});

// Registered builtin tool ids (union of platform.core.* / platform.workflows.* /
// platform.core.cases.* constants and the security namespaced builtins). Cross-
// referenced against agent-builder-common tool constants and the security
// solution / cases agent_builder tool registries.
const BUILTIN_TOOL_IDS = [
  'platform.core.index_explorer',
  'platform.core.search',
  'platform.core.list_indices',
  'platform.core.get_index_mapping',
  'platform.core.get_document_by_id',
  'platform.core.generate_esql',
  'platform.core.generate_workflow',
  'platform.core.execute_esql',
  'platform.core.execute_workflow',
  'platform.core.create_visualization',
  'platform.core.get_workflow_execution_status',
  'platform.core.resume_workflow_execution',
  'platform.core.list_workflow_executions',
  'platform.core.product_documentation',
  'platform.core.cases',
  'platform.core.integration_knowledge',
  'platform.core.sml_search',
  'platform.core.sml_attach',
  'platform.core.execute_connector_sub_action',
  'platform.core.list_inference_endpoints',
  'platform.core.cases.manage',
  'platform.core.cases.get_attachments',
  'platform.core.cases.manage_attachments',
  'platform.core.cases.observables',
  'platform.workflows.validate_workflow',
  'attachments.read',
  'security.alerts',
  'security.security_labs_search',
  'security.create_detection_rule',
  'security.get_entity',
  'security.entity_risk_score',
  'security.search_entities',
] as const;
