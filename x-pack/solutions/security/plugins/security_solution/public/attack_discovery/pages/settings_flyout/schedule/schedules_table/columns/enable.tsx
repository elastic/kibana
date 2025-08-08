/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSwitch,
  type EuiSwitchEvent,
} from '@elastic/eui';
import type { AttackDiscoverySchedule } from '@kbn/elastic-assistant-common';

import * as i18n from './translations';
import type { TableColumn } from './constants';

interface EnableSwitchProps {
  enabled: boolean;
  isDisabled: boolean;
  isLoading: boolean;
  onSwitchChange: (scheduleId: string, enabled: boolean) => Promise<void>;
  scheduleId: string;
}

const EnableSwitch = ({
  enabled,
  isDisabled,
  isLoading,
  onSwitchChange,
  scheduleId,
}: EnableSwitchProps) => {
  const [myIsLoading, setMyIsLoading] = useState(false);

  const onScheduleStateChange = useCallback(
    async (event: EuiSwitchEvent) => {
      setMyIsLoading(true);
      await onSwitchChange(scheduleId, !enabled);
      setMyIsLoading(false);
    },
    [enabled, onSwitchChange, scheduleId]
  );

  const showLoader = useMemo((): boolean => {
    if (myIsLoading !== isLoading) {
      return isLoading || myIsLoading;
    }
    return myIsLoading;
  }, [myIsLoading, isLoading]);

  return (
    <EuiFlexGroup alignItems="center" justifyContent="spaceAround">
      <EuiFlexItem grow={false}>
        {showLoader ? (
          <EuiLoadingSpinner size="m" data-test-subj="scheduleSwitchLoader" />
        ) : (
          <EuiSwitch
            data-test-subj="scheduleSwitch"
            showLabel={false}
            label=""
            disabled={isDisabled}
            checked={enabled}
            onChange={onScheduleStateChange}
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const createEnableColumn = ({
  isDisabled,
  isLoading,
  onSwitchChange,
}: {
  isDisabled: boolean;
  isLoading: boolean;
  onSwitchChange: (scheduleId: string, enabled: boolean) => Promise<void>;
}): TableColumn => {
  return {
    field: 'enabled',
    name: i18n.COLUMN_ENABLE,
    render: (_, schedule: AttackDiscoverySchedule) => (
      <EnableSwitch
        enabled={schedule.enabled}
        isDisabled={isDisabled}
        isLoading={isLoading}
        onSwitchChange={onSwitchChange}
        scheduleId={schedule.id}
      />
    ),
    width: '65px',
    align: 'center',
  };
};
