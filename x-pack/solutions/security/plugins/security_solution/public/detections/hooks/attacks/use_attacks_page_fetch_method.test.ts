/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

import { fetchQueryAttacks } from '../../containers/detection_engine/alerts/api';
import { useAttacksPageFetchMethod } from './use_attacks_page_fetch_method';

describe('useAttacksPageFetchMethod', () => {
  it('returns fetchQueryAttacks', () => {
    const { result } = renderHook(() => useAttacksPageFetchMethod());

    expect(result.current).toBe(fetchQueryAttacks);
  });
});
