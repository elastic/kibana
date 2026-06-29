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

import { useKibana } from '../../../../common/lib/kibana';
import { AttackDiscoveryEventTypes } from '../../../../common/lib/telemetry';
import type { AttackDiscoveryScheduleSource } from '../../../../common/lib/telemetry';
import { EmptyPage } from '../schedule/empty_page';
import { CreateButton } from '../schedule/create_button';
import { SchedulesTable } from '../schedule/schedules_table';
import { CreateFlyout } from '../schedule/create_flyout';
import { useScheduleApi } from '../schedule/logic/use_schedule_api';

export interface UseScheduleView {
  scheduleView: React.ReactNode;
  actionButtons: React.ReactNode;
}

export const useScheduleView = (): UseScheduleView => {
  const { telemetry } = useKibana().services;

  // showing / hiding the flyout:
  const [showFlyout, setShowFlyout] = useState<boolean>(false);
  const openFlyout = useCallback(
    (source: AttackDiscoveryScheduleSource) => {
      telemetry.reportEvent(AttackDiscoveryEventTypes.ScheduleCreateFlyoutOpened, { source });
      setShowFlyout(true);
    },
    [telemetry]
  );

  const openFlyoutFromEmptyState = useCallback(() => openFlyout('empty_state'), [openFlyout]);

  const openFlyoutFromScheduleTab = useCallback(() => openFlyout('schedule_tab'), [openFlyout]);

  const { useFindSchedules } = useScheduleApi();

  const {
    data: { total } = { total: 0 },
    isLoading: isDataLoading,
    refetch,
  } = useFindSchedules({
    disableToast: false,
  });

  const onClose = useCallback(() => {
    setShowFlyout(false);
    refetch();
  }, [refetch]);

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
          loadedContent={
            !total ? <EmptyPage onCreateClick={openFlyoutFromEmptyState} /> : <SchedulesTable />
          }
        />
        {showFlyout && <CreateFlyout onClose={onClose} />}
      </>
    );
  }, [isDataLoading, onClose, openFlyoutFromEmptyState, showFlyout, total]);

  const actionButtons = useMemo(() => {
    return total ? (
      <EuiFlexGroup alignItems="center" gutterSize="none">
        <EuiFlexItem grow={false}>
          <CreateButton onClick={openFlyoutFromScheduleTab} />
        </EuiFlexItem>
      </EuiFlexGroup>
    ) : null;
  }, [openFlyoutFromScheduleTab, total]);

  return { scheduleView, actionButtons };
};
