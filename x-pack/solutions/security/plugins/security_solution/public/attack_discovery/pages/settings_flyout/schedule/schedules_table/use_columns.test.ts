/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

import { useColumns } from './use_columns';
import {
  createActionsColumn,
  createEnableColumn,
  createNameColumn,
  createStatusColumn,
} from './columns';

jest.mock('./columns');

const mockCreateActionsColumn = createActionsColumn as jest.MockedFunction<
  typeof createActionsColumn
>;
const mockCreateEnableColumn = createEnableColumn as jest.MockedFunction<typeof createEnableColumn>;
const mockCreateNameColumn = createNameColumn as jest.MockedFunction<typeof createNameColumn>;
const mockCreateStatusColumn = createStatusColumn as jest.MockedFunction<typeof createStatusColumn>;

const openScheduleDetails = jest.fn();
const enableSchedule = jest.fn();
const disableSchedule = jest.fn();
const deleteSchedule = jest.fn();

describe('useColumns', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    renderHook(() =>
      useColumns({
        isDisabled: false,
        isLoading: false,
        openScheduleDetails,
        enableSchedule,
        disableSchedule,
        deleteSchedule,
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
    expect(mockCreateActionsColumn).toHaveBeenCalledWith({ isDisabled: false, deleteSchedule });
  });
});
