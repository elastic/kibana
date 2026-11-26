/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Alert } from '@kbn/alerting-types';
import { getDocumentIdentity } from './get_document_identity';

describe('getDocumentIdentity', () => {
  it('derives the history title from the rule name when the row has it', () => {
    const alert = {
      _id: 'a1',
      _index: 'idx',
      'kibana.alert.rule.name': ['Rule A'],
    } as unknown as Alert;

    expect(getDocumentIdentity(alert)).toEqual({
      flyoutDocumentId: 'a1',
      flyoutDocumentIndexName: 'idx',
      flyoutHistoryTitle: 'Alert: Rule A',
    });
  });

  it('leaves the title unset when the row has no rule name', () => {
    const alert = { _id: 'a1', _index: 'idx' } as unknown as Alert;

    expect(getDocumentIdentity(alert)).toEqual({
      flyoutDocumentId: 'a1',
      flyoutDocumentIndexName: 'idx',
    });
  });
});
