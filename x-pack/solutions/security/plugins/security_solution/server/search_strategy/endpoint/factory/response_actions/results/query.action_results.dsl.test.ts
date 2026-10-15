/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionResponsesRequestOptions } from '../../../../../../common/search_strategy/endpoint/response_actions';
import { buildActionResultsQuery } from './query.action_results.dsl';

describe('buildActionResultsQuery', () => {
  const options = {
    actionId: 'action-1',
    sort: { field: '@timestamp', order: 'desc' },
  } as unknown as ActionResponsesRequestOptions;

  it('only projects the completion timestamp instead of the whole document', () => {
    const { fields } = buildActionResultsQuery(options);

    expect(fields).toEqual([{ field: 'EndpointActions.completed_at' }]);
  });

  it('does not request wildcard fields (would leak response output)', () => {
    const { fields } = buildActionResultsQuery(options);

    expect(JSON.stringify(fields)).not.toContain('*');
  });
});
