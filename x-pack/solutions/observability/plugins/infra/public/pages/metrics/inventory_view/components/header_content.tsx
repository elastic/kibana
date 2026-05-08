/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';
import { FilterBar } from './filter_bar';
import { Toolbar } from './toolbars/toolbar';
import { ViewSwitcher } from './waffle/view_switcher';
import { useWaffleOptionsContext } from '../hooks/use_waffle_options';
import { useWaffleTimeContext } from '../hooks/use_waffle_time';

export const InventoryHeaderContent = () => {
  const { nodeType, changeView, view } = useWaffleOptionsContext();
  const { currentTime } = useWaffleTimeContext();

  return (
    <>
      <FilterBar interval="60s" />
      <EuiSpacer size="s" />
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="m">
        <Toolbar nodeType={nodeType} currentTime={currentTime} />
        <EuiFlexGroup
          responsive={false}
          css={css`
            margin: 0;
            justify-content: flex-end;
          `}
        >
          <EuiFlexItem grow={false}>
            <ViewSwitcher view={view} onChange={changeView} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </>
  );
};
