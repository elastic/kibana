/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractStagedActionsJson, STAGED_ACTIONS_SECTION_TITLE } from '.';

describe('extractStagedActionsJson', () => {
  const ACTIONS_JSON = JSON.stringify([
    { action_type: 'isolate_host', execution: 'kibana_api', title: 'Isolate host-1' },
  ]);

  const reasoning = (sections: unknown): Record<string, unknown> => ({
    summary: 'Approving executes ONLY the actions you toggle on.',
    sections,
  });

  it('pins the section title the Watch Floor YAML writes', () => {
    expect(STAGED_ACTIONS_SECTION_TITLE).toBe('Staged containment actions');
  });

  it('returns the array body of the staged-actions section, trimmed', () => {
    expect(
      extractStagedActionsJson(
        reasoning([
          { title: 'Incident', body: 'prose' },
          { title: STAGED_ACTIONS_SECTION_TITLE, body: `\n${ACTIONS_JSON} ` },
        ])
      )
    ).toBe(ACTIONS_JSON);
  });

  it('returns undefined when reasoning is absent', () => {
    expect(extractStagedActionsJson(undefined)).toBeUndefined();
    expect(extractStagedActionsJson(null)).toBeUndefined();
  });

  it('returns undefined when there are no sections', () => {
    expect(extractStagedActionsJson({ summary: 'prose only' })).toBeUndefined();
  });

  it('returns undefined when no section carries the pinned title', () => {
    expect(
      extractStagedActionsJson(reasoning([{ title: 'Incident', body: ACTIONS_JSON }]))
    ).toBeUndefined();
  });

  it('returns undefined when the body is not a string', () => {
    expect(
      extractStagedActionsJson(
        reasoning([{ title: STAGED_ACTIONS_SECTION_TITLE, body: [{ action_type: 'x' }] }])
      )
    ).toBeUndefined();
  });

  it('returns undefined when the body is not a JSON array at first glance', () => {
    expect(
      extractStagedActionsJson(
        reasoning([{ title: STAGED_ACTIONS_SECTION_TITLE, body: '{"recommended_actions": []}' }])
      )
    ).toBeUndefined();
  });

  it('returns undefined when the body exceeds the row bound', () => {
    const oversized = `[${'"x",'.repeat(9000)}"x"]`;

    expect(
      extractStagedActionsJson(reasoning([{ title: STAGED_ACTIONS_SECTION_TITLE, body: oversized }]))
    ).toBeUndefined();
  });

  it('keeps an empty staged array — nothing staged is a valid projection', () => {
    expect(
      extractStagedActionsJson(reasoning([{ title: STAGED_ACTIONS_SECTION_TITLE, body: '[]' }]))
    ).toBe('[]');
  });
});
