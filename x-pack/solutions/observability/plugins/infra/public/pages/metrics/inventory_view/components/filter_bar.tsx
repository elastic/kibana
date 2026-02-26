/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';

import { WaffleTimeControls } from './waffle/waffle_time_controls';
import { SearchBar } from './search_bar';

interface FilterBarProps {
  interval: string;
  rightSideItems?: React.ReactNode;
}

export const FilterBar = ({ interval, rightSideItems }: FilterBarProps) => (
  <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s" style={{ flexGrow: 0 }}>
    {rightSideItems && <EuiFlexItem grow={false}>{rightSideItems}</EuiFlexItem>}
    <EuiFlexItem>
      <SearchBar />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <WaffleTimeControls interval={interval} />
    </EuiFlexItem>
  </EuiFlexGroup>
);
