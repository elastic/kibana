/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useInventoryViews } from '../../../../hooks/use_inventory_views';
import { SnapshotNode } from '../../../../../common/http_api';
import { Layout } from './layout';

interface Props {
  reload: () => void;
  interval: string;
  nodes: SnapshotNode[];
  loading: boolean;
}

export const LayoutView = (props: Props) => {
  const { currentView } = useInventoryViews();
  return <Layout currentView={currentView} {...props} />;
};
