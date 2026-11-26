/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryClient } from '@kbn/react-query';
import { getInvestigationsRefetchInterval } from './investigation_state';
import { markInvestigationStarted } from './recent_investigation_start';

describe('getInvestigationsRefetchInterval', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
  });

  afterEach(() => jest.restoreAllMocks());

  it('polls every 5s while an investigation runs', () => {
    expect(
      getInvestigationsRefetchInterval(
        [{ investigation_state: 'completed' }, { investigation_state: 'in_progress' }],
        queryClient
      )
    ).toBe(5_000);
  });

  it.each(['completed', 'not_started', 'unknown'] as const)('does not poll a %s event', (state) => {
    expect(getInvestigationsRefetchInterval([{ investigation_state: state }], queryClient)).toBe(
      false
    );
  });

  it('polls every 5s for a minute after an investigation was started here', () => {
    const now = Date.now();
    markInvestigationStarted(queryClient, now);

    expect(
      getInvestigationsRefetchInterval([{ investigation_state: 'not_started' }], queryClient)
    ).toBe(5_000);

    jest.spyOn(Date, 'now').mockReturnValue(now + 60_000);
    expect(
      getInvestigationsRefetchInterval([{ investigation_state: 'not_started' }], queryClient)
    ).toBe(false);
  });
});
