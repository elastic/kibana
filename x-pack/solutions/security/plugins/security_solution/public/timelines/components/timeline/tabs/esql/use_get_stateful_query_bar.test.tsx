/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestProviders } from '../../../../../common/mock';
import { renderHook } from '@testing-library/react';
import { useGetStatefulQueryBar } from './use_get_stateful_query_bar';

describe('useGetStatefulQueryBar', () => {
  it('returns custom QueryBar', async () => {
    const { result } = renderHook(() => useGetStatefulQueryBar(), {
      wrapper: TestProviders,
    });

    expect(result.current).toHaveProperty('CustomStatefulTopNavKqlQueryBar');
    expect(result.current.CustomStatefulTopNavKqlQueryBar).not.toBeUndefined();
  });
});
