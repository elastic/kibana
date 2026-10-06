/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_UUID } from '@kbn/rule-data-utils';
import { ALERT_ATTACK_DISCOVERY_ALERT_IDS } from '@kbn/discoveries/impl/attack_discovery/alert_fields';

import { extractCreatedAttacks } from '.';

describe('extractCreatedAttacks', () => {
  it('pairs each created attack id with its underlying detection alert ids', () => {
    const alertDocuments = [
      {
        [ALERT_UUID]: 'attack-1',
        [ALERT_ATTACK_DISCOVERY_ALERT_IDS]: ['detection-a', 'detection-b'],
      },
    ];

    expect(extractCreatedAttacks({ alertDocuments, createdDocumentIds: ['attack-1'] })).toEqual([
      { alertIds: ['detection-a', 'detection-b'], attackId: 'attack-1' },
    ]);
  });

  it('excludes documents that were not created this run (e.g. version conflicts)', () => {
    const alertDocuments = [
      {
        [ALERT_UUID]: 'attack-1',
        [ALERT_ATTACK_DISCOVERY_ALERT_IDS]: ['detection-a'],
      },
      {
        [ALERT_UUID]: 'attack-2',
        [ALERT_ATTACK_DISCOVERY_ALERT_IDS]: ['detection-b'],
      },
    ];

    expect(extractCreatedAttacks({ alertDocuments, createdDocumentIds: ['attack-1'] })).toEqual([
      { alertIds: ['detection-a'], attackId: 'attack-1' },
    ]);
  });

  it('returns an empty array when nothing was created', () => {
    const alertDocuments = [
      {
        [ALERT_UUID]: 'attack-1',
        [ALERT_ATTACK_DISCOVERY_ALERT_IDS]: ['detection-a'],
      },
    ];

    expect(extractCreatedAttacks({ alertDocuments, createdDocumentIds: [] })).toEqual([]);
  });

  it('skips documents missing an attack id (ALERT_UUID)', () => {
    const alertDocuments = [
      {
        [ALERT_ATTACK_DISCOVERY_ALERT_IDS]: ['detection-a'],
      },
    ];

    expect(extractCreatedAttacks({ alertDocuments, createdDocumentIds: ['attack-1'] })).toEqual([]);
  });

  it('defaults to an empty alertIds array when the document has none', () => {
    const alertDocuments = [
      {
        [ALERT_UUID]: 'attack-1',
      },
    ];

    expect(extractCreatedAttacks({ alertDocuments, createdDocumentIds: ['attack-1'] })).toEqual([
      { alertIds: [], attackId: 'attack-1' },
    ]);
  });
});
