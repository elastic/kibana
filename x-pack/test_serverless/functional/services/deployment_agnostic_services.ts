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
  aceEditor: platformfunctionalServices.aceEditor,
  actions: platformfunctionalServices.actions,
  appsMenu: platformfunctionalServices.appsMenu,
  browser: platformfunctionalServices.browser,
  canvasElement: platformfunctionalServices.canvasElement,
  cases: platformfunctionalServices.cases,
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
  menuToggle: platformfunctionalServices.menuToggle,
  monacoEditor: platformfunctionalServices.monacoEditor,
  esql: platformfunctionalServices.esql,
  pieChart: platformfunctionalServices.pieChart,
  pipelineEditor: platformfunctionalServices.pipelineEditor,
  pipelineList: platformfunctionalServices.pipelineList,
  png: platformfunctionalServices.png,
  queryBar: platformfunctionalServices.queryBar,
  random: platformfunctionalServices.random,
  renderable: platformfunctionalServices.renderable,
  reporting: platformfunctionalServices.reporting,
  retryOnStale: platformfunctionalServices.retryOnStale,
  rules: platformfunctionalServices.rules,
  sampleData: platformfunctionalServices.sampleData,
  savedObjectsFinder: platformfunctionalServices.savedObjectsFinder,
  savedQueryManagementComponent: platformfunctionalServices.savedQueryManagementComponent,
  selectable: platformfunctionalServices.selectable,
  screenshots: platformfunctionalServices.screenshots,
  snapshots: platformfunctionalServices.snapshots,
  supertest: platformfunctionalServices.supertest,
  testSubjects: platformfunctionalServices.testSubjects,
  transform: platformfunctionalServices.transform,
  toasts: platformfunctionalServices.toasts,
  userMenu: platformfunctionalServices.userMenu,
  vegaDebugInspector: platformfunctionalServices.vegaDebugInspector,
  ...deploymentAgnosticSharedServices,
};
