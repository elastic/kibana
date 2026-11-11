/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode, Ref } from 'react';
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
  leading,
  filters,
  containerRef,
}: {
  /** `undefined` until the tab has loaded once. */
  environments: string[] | undefined;
  isLoading: boolean;
  onRefresh: () => void;
  /**
   * A flex item that fills the row before the environment picker, e.g. a query bar; the items are
   * then aligned to the top, so a bar that grows does not move them.
   */
  leading?: ReactNode;
  /** Filter buttons that follow the environment picker in its group. */
  filters?: ReactNode;
  /** The positioned element around the row, to measure it or to place what grows over it. */
  containerRef?: Ref<HTMLDivElement>;
}) {
  const { environment, setEnvironment } = useEnvironment();

  return (
    <div ref={containerRef} css={{ position: 'relative' }}>
      <EuiFlexGroup gutterSize="s" alignItems={leading ? 'flexStart' : 'center'} wrap>
        {leading}
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
        {/*
          At the end of the row, or of its own when the filters leave no room. As wide as the
          picker is, which a range's label changes: a fixed width would leave a gap before a short
          label, e.g. "Last 12 years".
        */}
        <EuiFlexItem grow={false} css={{ flexShrink: 0, marginInlineStart: 'auto' }}>
          <TimeRangePicker onRefresh={onRefresh} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
