/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PND_GATE_IDS, type PndConversation } from '@kbn/pnd-common';

import { readInvestigationTitles } from '.';

const ALERT_ID = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';

const createConversation = ({
  correlationId = ALERT_ID,
  id,
  kind,
  title,
}: {
  correlationId?: string;
  id: string;
  kind: PndConversation['kind'];
  title: string;
}): PndConversation => ({
  correlationId,
  createdAt: '2026-08-18T12:00:00.000Z',
  id,
  kind,
  title,
  updatedAt: '2026-08-18T12:30:00.000Z',
  ...(kind === 'thread' ? { gateId: PND_GATE_IDS.incidentContained } : {}),
});

describe('readInvestigationTitles', () => {
  it('names an investigation by its own conversation title', () => {
    const conversations = [
      createConversation({ id: 'inv-1', kind: 'investigation', title: 'PowerShell on host-1' }),
    ];

    expect(readInvestigationTitles(conversations).get(ALERT_ID)).toBe('PowerShell on host-1');
  });

  it('keys the title by the discovery the investigation was opened for', () => {
    const conversations = [
      createConversation({ id: 'inv-1', kind: 'investigation', title: 'PowerShell on host-1' }),
    ];

    expect([...readInvestigationTitles(conversations).keys()]).toEqual([ALERT_ID]);
  });

  /** An incident of the same discovery is a different conversation with a different title. */
  it('ignores the incident conversation of the same discovery', () => {
    const conversations = [
      createConversation({ id: 'inc-1', kind: 'incident', title: 'Incident on host-1' }),
    ];

    expect(readInvestigationTitles(conversations).size).toBe(0);
  });

  it('ignores a thread', () => {
    const conversations = [
      createConversation({ id: 'thread-1', kind: 'thread', title: 'Confirm containment' }),
    ];

    expect(readInvestigationTitles(conversations).size).toBe(0);
  });

  it('ignores the tuning conversation', () => {
    const conversations = [
      createConversation({ id: 'tune-1', kind: 'tuning', title: 'Rule tuning' }),
    ];

    expect(readInvestigationTitles(conversations).size).toBe(0);
  });

  /** `_rename` accepts `''`, and an empty heading is worse than the caller's honest fallback. */
  it('drops a blank title rather than naming an investigation with it', () => {
    const conversations = [
      createConversation({ id: 'inv-1', kind: 'investigation', title: '   ' }),
    ];

    expect(readInvestigationTitles(conversations).size).toBe(0);
  });

  it('reads nothing from an empty conversation list', () => {
    expect(readInvestigationTitles([]).size).toBe(0);
  });
});
