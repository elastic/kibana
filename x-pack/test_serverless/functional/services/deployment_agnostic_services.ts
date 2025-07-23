/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as platformfunctionalServices } from '@kbn/test-suites-xpack-platform/functional/services';
import { services as deploymentAgnosticSharedServices } from '../../shared/services/deployment_agnostic_services';

export const services = {
  __webdriver__: platformfunctionalServices.__webdriver__,
  actions: platformfunctionalServices.actions,
  browser: platformfunctionalServices.browser,
  comboBox: platformfunctionalServices.comboBox,
  dashboardAddPanel: platformfunctionalServices.dashboardAddPanel,
  dashboardBadgeActions: platformfunctionalServices.dashboardBadgeActions,
  dashboardCustomizePanel: platformfunctionalServices.dashboardCustomizePanel,
  dashboardPanelActions: platformfunctionalServices.dashboardPanelActions,
  dataGrid: platformfunctionalServices.dataGrid,
  dataStreams: platformfunctionalServices.dataStreams,
  dataViews: platformfunctionalServices.dataViews,
  elasticChart: platformfunctionalServices.elasticChart,
  fieldEditor: platformfunctionalServices.fieldEditor,
  filterBar: platformfunctionalServices.filterBar,
  find: platformfunctionalServices.find,
  flyout: platformfunctionalServices.flyout,
  globalNav: platformfunctionalServices.globalNav,
  inspector: platformfunctionalServices.inspector,
  listingTable: platformfunctionalServices.listingTable,
  ml: platformfunctionalServices.ml,
  monacoEditor: platformfunctionalServices.monacoEditor,
  esql: platformfunctionalServices.esql,
  pieChart: platformfunctionalServices.pieChart,
  png: platformfunctionalServices.png,
  queryBar: platformfunctionalServices.queryBar,
  random: platformfunctionalServices.random,
  renderable: platformfunctionalServices.renderable,
  reporting: platformfunctionalServices.reporting,
  retryOnStale: platformfunctionalServices.retryOnStale,
  rules: platformfunctionalServices.rules,
  sampleData: platformfunctionalServices.sampleData,
  screenshots: platformfunctionalServices.screenshots,
  snapshots: platformfunctionalServices.snapshots,
  supertest: platformfunctionalServices.supertest,
  testSubjects: platformfunctionalServices.testSubjects,
  transform: platformfunctionalServices.transform,
  toasts: platformfunctionalServices.toasts,
  userMenu: platformfunctionalServices.userMenu,
  ...deploymentAgnosticSharedServices,
};
