/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';

import type { TableColumn } from './columns';
import {
  createActionsColumn,
  createEnableColumn,
  createNameColumn,
  createStatusColumn,
} from './columns';

export const useColumns = ({
  isDisabled,
  isLoading,
  openScheduleDetails,
  enableSchedule,
  disableSchedule,
  deleteSchedule,
}: {
  isDisabled: boolean;
  isLoading: boolean;
  openScheduleDetails: (scheduleId: string) => void;
  enableSchedule: (scheduleId: string) => Promise<void>;
  disableSchedule: (scheduleId: string) => Promise<void>;
  deleteSchedule: (scheduleId: string) => Promise<void>;
}): TableColumn[] => {
  const onSwitchChange = useCallback(
    async (scheduleId: string, enabled: boolean) => {
      if (enabled) {
        await enableSchedule(scheduleId);
      } else {
        await disableSchedule(scheduleId);
      }
    },
    [disableSchedule, enableSchedule]
  );
  return useMemo(
    () => [
      createNameColumn({ openScheduleDetails }),
      createStatusColumn(),
      createEnableColumn({ isDisabled, isLoading, onSwitchChange }),
      createActionsColumn({ isDisabled, deleteSchedule }),
    ],
    [deleteSchedule, isDisabled, isLoading, onSwitchChange, openScheduleDetails]
  );
};
