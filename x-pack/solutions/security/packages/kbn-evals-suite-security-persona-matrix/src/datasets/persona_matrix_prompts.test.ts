/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PERSONA_MATRIX_EXAMPLES } from './persona_matrix_prompts';
import { PERSONA_MATRIX_TOOL_IDS } from '../fixtures/persona_matrix_tools_seed';

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
});
