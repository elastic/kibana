/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
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
  filters,
  afterFilters,
}: {
  /** `undefined` until the tab has loaded once. */
  environments: string[] | undefined;
  isLoading: boolean;
  onRefresh: () => void;
  /** Filter buttons that follow the environment picker in its group. */
  filters?: ReactNode;
  /** Flex items between the filters and the time range, e.g. a button that clears the filters. */
  afterFilters?: ReactNode;
}) {
  const { environment, setEnvironment } = useEnvironment();

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" wrap>
      <EuiFlexItem grow={false}>
        {/* Compressed, as tall as the date picker beside it. */}
        <EuiFilterGroup compressed>
          <EnvironmentFilter
            environments={environments ?? []}
            selected={environment}
            onChange={setEnvironment}
            isLoading={isLoading && !environments}
          />
          {filters}
        </EuiFilterGroup>
      </EuiFlexItem>
      {afterFilters}
      {/* At the end of the row, or of its own when the filters leave no room. */}
      <EuiFlexItem grow={false} css={{ flexBasis: 420, marginInlineStart: 'auto' }}>
        <TimeRangePicker onRefresh={onRefresh} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
