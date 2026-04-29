/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useGetAlertsByRuleColumns } from './columns';
import { renderHook } from '@testing-library/react';

describe('useGetAlertsByRuleColumns', () => {
  it('should return base columns (2)', () => {
    const { result } = renderHook(() => useGetAlertsByRuleColumns(false));
    expect(result.current).toHaveLength(2);
  });

  it('should return all columns (3)', () => {
    const { result } = renderHook(() => useGetAlertsByRuleColumns(true));
    expect(result.current).toHaveLength(3);
  });
});
