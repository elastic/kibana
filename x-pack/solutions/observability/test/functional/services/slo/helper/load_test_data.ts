/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { generate } from '@kbn/infra-forge';
import { FtrProviderContext } from '../../../ftr_provider_context';

export async function loadTestData(getService: FtrProviderContext['getService']) {
  const DATE_VIEW = 'kbn-data-forge-fake_hosts';
  const DATA_VIEW_ID = 'data-view-id';
  const dataViewApi = getService('dataViewApi');
  const esClient = getService('es');
  const logger = getService('log');

  await generate({ esClient, lookback: 'now-16m', logger });
  await dataViewApi.create({
    name: DATE_VIEW,
    id: DATA_VIEW_ID,
    title: DATE_VIEW,
  });
}
