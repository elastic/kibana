/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FilterBar } from './filter_bar';
import { Toolbar } from './toolbars/toolbar';
import { ViewSwitcher } from './waffle/view_switcher';
import { SavedViews } from './saved_views';
import { useWaffleOptionsContext } from '../hooks/use_waffle_options';
import { useWaffleTimeContext } from '../hooks/use_waffle_time';

interface InventoryHeaderContentProps {
  /** Map-only legend control rendered before the view switcher. */
  legendControls?: ReactNode;
}

export const InventoryHeaderContent = ({
  legendControls,
}: InventoryHeaderContentProps): React.ReactElement => {
  const { nodeType, changeView, view } = useWaffleOptionsContext();
  const { currentTime } = useWaffleTimeContext();

  return (
    <EuiFlexGroup
      data-test-subj="inventoryPageHeader"
      direction="column"
      gutterSize="s"
      responsive={false}
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
          <EuiFlexItem>
            <FilterBar interval="60s" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <SavedViews />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="m">
          <Toolbar nodeType={nodeType} currentTime={currentTime} />
          <EuiFlexGroup
            gutterSize="s"
            alignItems="center"
            responsive={false}
            justifyContent="flexEnd"
          >
            {legendControls != null && <EuiFlexItem grow={false}>{legendControls}</EuiFlexItem>}
            <EuiFlexItem grow={false}>
              <ViewSwitcher view={view} onChange={changeView} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
