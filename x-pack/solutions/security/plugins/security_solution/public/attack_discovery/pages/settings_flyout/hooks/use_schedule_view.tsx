/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonLoading,
  EuiSkeletonText,
  EuiSkeletonTitle,
} from '@elastic/eui';
import { ATTACK_DISCOVERY_SCHEDULES_ENABLED_FEATURE_FLAG } from '@kbn/elastic-assistant-common';

import React, { useCallback, useMemo, useState } from 'react';
import * as i18n from './translations';

import { useKibana } from '../../../../common/lib/kibana';
import { useFindAttackDiscoverySchedules } from '../schedule/logic/use_find_schedules';
import { EmptyPage } from '../schedule/empty_page';
import { SchedulesTable } from '../schedule/schedules_table';
import { CreateFlyout } from '../schedule/create_flyout';

export interface UseScheduleView {
  scheduleView: React.ReactNode;
  actionButtons: React.ReactNode;
}

export const useScheduleView = (): UseScheduleView => {
  const {
    services: { featureFlags },
  } = useKibana();

  const isAttackDiscoverySchedulingEnabled = featureFlags.getBooleanValue(
    ATTACK_DISCOVERY_SCHEDULES_ENABLED_FEATURE_FLAG,
    false
  );

  // showing / hiding the flyout:
  const [showFlyout, setShowFlyout] = useState<boolean>(false);
  const openFlyout = useCallback(() => setShowFlyout(true), []);
  const onClose = useCallback(() => setShowFlyout(false), []);

  // TODO: add separate hook to fetch schedules stats/count
  const { data: { total } = { total: 0 }, isLoading: isDataLoading } =
    useFindAttackDiscoverySchedules({ disableToast: !isAttackDiscoverySchedulingEnabled });

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
          <EuiButton
            data-test-subj="createNewSchedule"
            fill
            onClick={openFlyout}
            size="s"
            iconType="plusInCircle"
          >
            {i18n.CREATE_NEW_SCHEDULE}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    ) : null;
  }, [openFlyout, total]);

  return { scheduleView, actionButtons };
};
