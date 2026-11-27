/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockAgentIdentity, mockAgentRow } from './mocks';
import { toSummaryRecord } from './summary_record';

describe('toSummaryRecord', () => {
  it("carries the agent's ID, data sources and watchlists", () => {
    expect(
      toSummaryRecord(mockAgentIdentity.entityId, {
        ...mockAgentRow,
        dataSources: ['endpoint'],
        watchlistIds: ['agents-for-departing-employees'],
      })
    ).toEqual({
      entity: {
        id: mockAgentIdentity.entityId,
        source: ['endpoint'],
        attributes: { watchlists: ['agents-for-departing-employees'] },
      },
    });
  });

  it('keeps the ID when there is no store row', () => {
    expect(toSummaryRecord(mockAgentIdentity.entityId)).toEqual({
      entity: { id: mockAgentIdentity.entityId, source: [], attributes: { watchlists: [] } },
    });
  });
});
