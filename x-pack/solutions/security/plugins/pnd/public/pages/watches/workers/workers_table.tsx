/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useWorkers } from '../../../hooks/use_workers_api';
import { WorkerCatalogTable } from '../components/worker_catalog_table';
import * as i18n from './translations';

/**
 * The Workers page's table: every projected Worker, across every Watch (kibana-phf4.6).
 *
 * Read-only. It carries the Watches column the per-watch section omits, and it uses the same
 * `WorkerCatalogTable` so a step reads the same way in both places.
 */
export const WorkersTable: React.FC = () => {
  const { data, isLoading, error } = useWorkers();

  return (
    <WorkerCatalogTable
      caption={i18n.TABLE_CAPTION}
      data-test-subj="pndWorkersTable"
      error={error ? i18n.LOAD_ERROR : undefined}
      loading={isLoading}
      noItemsMessage={i18n.NO_WORKERS}
      showWatches
      workers={data?.workers ?? []}
    />
  );
};
