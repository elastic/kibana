/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useTrackPageview } from '@kbn/observability-shared-plugin/public';
import { useMetricsBreadcrumbs } from '../../../hooks/use_metrics_breadcrumbs';
import { EsqlInventoryGrid } from './components/esql_inventory_grid';

export const EsqlInventoryPage: React.FC = () => {
  useTrackPageview({ app: 'infra_metrics', path: 'esql_inventory' });
  useTrackPageview({ app: 'infra_metrics', path: 'esql_inventory', delay: 15000 });

  useMetricsBreadcrumbs([
    {
      text: 'ES|QL Inventory',
    },
  ]);

  return <EsqlInventoryGrid />;
};

// Default export for lazy loading
// eslint-disable-next-line import/no-default-export
export default EsqlInventoryPage;
