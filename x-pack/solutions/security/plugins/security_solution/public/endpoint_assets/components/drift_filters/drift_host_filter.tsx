/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiSuperSelect } from '@elastic/eui';
import type { EuiSuperSelectOption } from '@elastic/eui';
import * as i18n from '../../pages/translations';

export interface HostOption {
  host_id: string;
  host_name: string;
  event_count: number;
}

export interface DriftHostFilterProps {
  availableHosts: HostOption[];
  selectedHostId: string;
  onHostChange: (hostId: string) => void;
  isLoading?: boolean;
}

const ALL_HOSTS_VALUE = '';

const DriftHostFilterComponent: React.FC<DriftHostFilterProps> = ({
  availableHosts,
  selectedHostId,
  onHostChange,
  isLoading = false,
}) => {
  const options: Array<EuiSuperSelectOption<string>> = useMemo(() => {
    const hostOptions: Array<EuiSuperSelectOption<string>> = [
      {
        value: ALL_HOSTS_VALUE,
        inputDisplay: i18n.DRIFT_FILTER_ALL_HOSTS,
        dropdownDisplay: (
          <strong>{i18n.DRIFT_FILTER_ALL_HOSTS}</strong>
        ),
      },
      ...availableHosts.map((host) => ({
        value: host.host_id,
        inputDisplay: host.host_name,
        dropdownDisplay: (
          <div>
            <strong>{host.host_name}</strong>
            <div style={{ fontSize: '0.8em', color: '#69707D' }}>
              {host.event_count} {host.event_count === 1 ? 'event' : 'events'}
            </div>
          </div>
        ),
      })),
    ];
    return hostOptions;
  }, [availableHosts]);

  return (
    <EuiSuperSelect
      data-test-subj="drift-host-filter"
      options={options}
      valueOfSelected={selectedHostId}
      onChange={onHostChange}
      isLoading={isLoading}
      compressed
      style={{ minWidth: 180 }}
    />
  );
};

export const DriftHostFilter = React.memo(DriftHostFilterComponent);
DriftHostFilter.displayName = 'DriftHostFilter';
