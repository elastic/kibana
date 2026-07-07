/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonLoading,
  EuiSkeletonText,
  EuiSkeletonTitle,
} from '@elastic/eui';

import React, { useCallback, useMemo, useState } from 'react';

import { useFindAttackDiscoverySchedules } from '../schedule/logic/use_find_schedules';
import { EmptyPage } from '../schedule/empty_page';
import { CreateButton } from '../schedule/create_button';
import { SchedulesTable } from '../schedule/schedules_table';
import { CreateFlyout } from '../schedule/create_flyout';

export interface UseScheduleView {
  scheduleView: React.ReactNode;
  actionButtons: React.ReactNode;
}

export const useScheduleView = (): UseScheduleView => {
  // showing / hiding the flyout:
  const [showFlyout, setShowFlyout] = useState<boolean>(false);
  const openFlyout = useCallback(() => setShowFlyout(true), []);
  const onClose = useCallback(() => setShowFlyout(false), []);

  // TODO: add separate hook to fetch schedules stats/count
  const { data: { total } = { total: 0 }, isLoading: isDataLoading } =
    useFindAttackDiscoverySchedules({ disableToast: false });

  const scheduleView = useMemo(() => {
    return (
      <>
        <EuiSkeletonLoading
          isLoading={isDataLoading}
          loadingContent={
            <>
              <EuiSkeletonTitle />
              <EuiSkeletonText />
            </>
          }
          loadedContent={!total ? <EmptyPage /> : <SchedulesTable />}
        />
        {showFlyout && <CreateFlyout onClose={onClose} />}
      </>
    );
  }, [isDataLoading, onClose, showFlyout, total]);

  const actionButtons = useMemo(() => {
    return total ? (
      <EuiFlexGroup alignItems="center" gutterSize="none">
        <EuiFlexItem grow={false}>
          <CreateButton onClick={openFlyout} />
        </EuiFlexItem>
      </EuiFlexGroup>
    ) : null;
  }, [openFlyout, total]);

  return { scheduleView, actionButtons };
};
