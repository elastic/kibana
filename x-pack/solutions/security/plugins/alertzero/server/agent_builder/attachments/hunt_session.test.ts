/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHuntSessionAttachmentType, HUNT_SESSION_ATTACHMENT_TYPE } from './hunt_session';
import { formatToText } from './test_utils';

const sessionState = {
  query: 'FROM logs-* | LIMIT 10',
  filters: [],
  timeRange: { from: 'now-7d', to: 'now' },
  columns: ['@timestamp'],
  dataViewId: 'dv-1',
};
const base = {
  version: 1,
  definition: {
    id: 'hunt',
    version: 1,
    name: 'Rare LSASS access',
    hypothesis: 'Credential dumping',
  },
  revision: 1,
};
const manual = {
  ...base,
  trigger: 'manual',
  has_manual_append: false,
  preservations: [
    {
      preservation_id: 'p1',
      actor: 'analyst',
      timestamp: '2026-11-04T12:00:00.000Z',
      ...sessionState,
      evidenceFingerprints: ['a', 'b'],
      selectedEvidence: [{ a: 1 }, { b: 2 }],
    },
  ],
  resumeSnapshot: sessionState,
};
const automated = {
  ...base,
  trigger: 'automated',
  has_manual_append: false,
  adjudication: {
    group_id: 'v1:abc',
    summary: 'Suspicious',
    severity: 'high',
    hypotheses: ['h'],
    citations: [{ kind: 'raw_event', index: 'logs-1', id: 'e1' }],
    executionWindow: { from: 'now-7d', to: 'now' },
    query: 'FROM logs-*',
  },
};

describe('hunt session attachment type', () => {
  const attachmentType = createHuntSessionAttachmentType();

  it('is the allow-listed, readonly security.hunt_session type', () => {
    expect(attachmentType.id).toBe('security.hunt_session');
    expect(HUNT_SESSION_ATTACHMENT_TYPE).toBe('security.hunt_session');
    expect(attachmentType.isReadonly).toBe(true);
  });

  it.each([
    ['a manual session', manual],
    ['an automated session', automated],
    [
      'an automated session a human extended',
      {
        ...automated,
        ...manual,
        trigger: 'automated',
        has_manual_append: true,
        adjudication: automated.adjudication,
      },
    ],
  ])('accepts %s', async (_label, input) => {
    expect((await attachmentType.validate(input)).valid).toBe(true);
  });

  it.each([
    ['a manual session without preservations', { ...manual, preservations: undefined }],
    ['a manual session without a resume snapshot', { ...manual, resumeSnapshot: undefined }],
    ['an automated session without an adjudication', { ...automated, adjudication: undefined }],
    ['an unknown field', { ...manual, extra: true }],
    ['a revision of zero', { ...manual, revision: 0 }],
    ['an unknown version', { ...manual, version: 2 }],
  ])('rejects %s', async (_label, input) => {
    expect((await attachmentType.validate(input)).valid).toBe(false);
  });

  it('tells the agent the hunt and the evidence count, not the stored rows or queries', async () => {
    const text = await formatToText(attachmentType, {} as never, manual);

    expect(text).toContain('Rare LSASS access');
    expect(text).toContain('Credential dumping');
    expect(text).toContain('Preserved evidence rows: 2.');
    expect(text).not.toContain('FROM logs-*');
  });
});
