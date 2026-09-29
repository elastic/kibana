/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import { renderHook } from '@testing-library/react';

import { useColumns } from './use_columns';
import {
  createActionsColumn,
  createEnableColumn,
  createNameColumn,
  createStatusColumn,
} from './columns';

vi.mock('./columns');

const mockCreateActionsColumn = createActionsColumn as MockedFunction<typeof createActionsColumn>;
const mockCreateEnableColumn = createEnableColumn as MockedFunction<typeof createEnableColumn>;
const mockCreateNameColumn = createNameColumn as MockedFunction<typeof createNameColumn>;
const mockCreateStatusColumn = createStatusColumn as MockedFunction<typeof createStatusColumn>;

const openScheduleDetails = vi.fn();
const enableSchedule = vi.fn();
const disableSchedule = vi.fn();
const requestDeleteSchedule = vi.fn();

describe('useColumns', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    renderHook(() =>
      useColumns({
        isDisabled: false,
        isLoading: false,
        openScheduleDetails,
        enableSchedule,
        disableSchedule,
        requestDeleteSchedule,
      })
    );
  });

  it('should invoke `createNameColumn`', () => {
    expect(mockCreateNameColumn).toHaveBeenCalledWith({ openScheduleDetails });
  });

  it('should invoke `createStatusColumn`', () => {
    expect(mockCreateStatusColumn).toHaveBeenCalled();
  });

  it('should invoke `createEnableColumn`', () => {
    expect(mockCreateEnableColumn).toHaveBeenCalledWith({
      isDisabled: false,
      isLoading: false,
      onSwitchChange: expect.anything(),
    });
  });

  it('should invoke `createActionsColumn`', () => {
    expect(mockCreateActionsColumn).toHaveBeenCalledWith({
      isDisabled: false,
      requestDeleteSchedule,
    });
  });
});
