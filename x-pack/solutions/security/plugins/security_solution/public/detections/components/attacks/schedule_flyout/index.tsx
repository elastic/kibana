/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { noop } from 'lodash/fp';

import { SettingsFlyout } from '../../../../attack_discovery/pages/settings_flyout';
import { SCHEDULE_TAB_ID } from '../../../../attack_discovery/pages/settings_flyout/constants';

export interface SchedulesFlyoutProps {
  /**
   * Handles the flyout `onClose` callback
   */
  onClose: () => void;
}

/**
 * The wrapper around attack discovery schedules flyout
 * NOTE: Added to hide internal implementation and bunch of not used fields
 */
export const SchedulesFlyout = React.memo(({ onClose }: SchedulesFlyoutProps) => {
  return (
    <SettingsFlyout
      connectorId={undefined}
      defaultSelectedTabId={SCHEDULE_TAB_ID}
      end={undefined}
      filters={undefined}
      onClose={onClose}
      onConnectorIdSelected={noop}
      onGenerate={() => Promise.resolve()}
      query={undefined}
      setEnd={noop}
      setFilters={noop}
      setQuery={noop}
      setStart={noop}
      start={undefined}
      localStorageAttackDiscoveryMaxAlerts={undefined}
      setLocalStorageAttackDiscoveryMaxAlerts={noop}
    />
  );
});
SchedulesFlyout.displayName = 'SchedulesFlyout';
