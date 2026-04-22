/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useLeadingControlColumns } from './use_leading_control_columns';

describe('useLeadingControlColumns', () => {
  const defaultArgs = {
    canUseTimeline: false,
    investigateInTimeline: jest.fn(),
  };

  it('returns no timeline action when canUseTimeline is false', () => {
    const { result } = renderHook(() => useLeadingControlColumns(defaultArgs));
    expect(result.current.find((c) => c.id === 'entity-analytics-timeline-action')).toBeUndefined();
  });

  it('returns timeline action when canUseTimeline is true', () => {
    const { result } = renderHook(() =>
      useLeadingControlColumns({ ...defaultArgs, canUseTimeline: true })
    );
    expect(result.current.find((c) => c.id === 'entity-analytics-timeline-action')).toBeDefined();
  });
});
