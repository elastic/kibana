/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import { discoverPluginMock } from '@kbn/discover-plugin/public/mocks';
import { fleetMock } from '@kbn/fleet-plugin/public/mocks';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { sessionStorageMock } from '@kbn/core-http-server-mocks';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';

export const getMockDependencies = () => ({
  data: dataPluginMock.createStartContract(),
  unifiedSearch: unifiedSearchPluginMock.createStartContract(),
  charts: chartPluginMock.createStartContract(),
  discover: discoverPluginMock.createStartContract(),
  fleet: fleetMock.createStartMock(),
  licensing: licensingMock.createStart(),
  uiActions: uiActionsPluginMock.createStartContract(),
  storage: sessionStorageMock.create(),
  share: sharePluginMock.createStartContract(),
});
