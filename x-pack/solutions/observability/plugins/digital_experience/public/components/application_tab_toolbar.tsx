/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFilterGroup, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useEnvironment } from '../hooks/use_environment';
import { EnvironmentFilter } from './environment_filter';
import { TimeRangePicker } from './time_range_picker';

/** The environment picker and time range of an application's tab, shared with the Overview. */
export function ApplicationTabToolbar({
  environments,
  isLoading,
  onRefresh,
}: {
  /** `undefined` until the tab has loaded once. */
  environments: string[] | undefined;
  isLoading: boolean;
  onRefresh: () => void;
}) {
  const { environment, setEnvironment } = useEnvironment();

  return (
    <EuiFlexGroup gutterSize="s" alignItems="flexStart">
      <EuiFlexItem grow={false}>
        <EuiFilterGroup>
          <EnvironmentFilter
            environments={environments ?? []}
            selected={environment}
            onChange={setEnvironment}
            isLoading={isLoading && !environments}
          />
        </EuiFilterGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <TimeRangePicker onRefresh={onRefresh} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
