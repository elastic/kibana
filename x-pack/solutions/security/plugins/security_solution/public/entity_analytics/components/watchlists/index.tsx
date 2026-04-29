/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { WatchlistsManagementTable } from './components/watchlists_management_table';

export const Watchlists = () => {
  const spaceId = useSpaceId();

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>{spaceId && <WatchlistsManagementTable spaceId={spaceId} />}</EuiFlexItem>
    </EuiFlexGroup>
  );
};
