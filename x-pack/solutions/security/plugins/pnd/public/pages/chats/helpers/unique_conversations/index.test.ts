/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockNestedIncident, mockNestedInvestigation } from '../../mock/conversations';
import { uniqueConversations } from '.';

describe('uniqueConversations', () => {
  it('drops a conversation that appears in both paged kind responses', () => {
    const result = uniqueConversations([
      mockNestedIncident,
      mockNestedInvestigation,
      mockNestedInvestigation,
    ]);

    expect(result.map(({ id }) => id)).toEqual([mockNestedIncident.id, mockNestedInvestigation.id]);
  });

  it('keeps the first occurrence when the same id arrives twice', () => {
    const first = { ...mockNestedInvestigation, title: 'First title' };
    const second = { ...mockNestedInvestigation, title: 'Second title' };

    expect(uniqueConversations([first, second])[0].title).toEqual('First title');
  });

  it('returns an empty list for an empty input', () => {
    expect(uniqueConversations([])).toEqual([]);
  });
});
