/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
// eslint-disable-next-line @kbn/imports/no_boundary_crossing
import { services as functionalServices } from '../../../test/functional/services';
import { services as deploymentAgnosticSharedServices } from '../../shared/services/deployment_agnostic_services';

/*
 * Some FTR services from stateful functional tests are compatible with serverless environment
 * While adding a new one, make sure to verify that it works on both Kibana CI and MKI
 */
const deploymentAgnosticFunctionalServices = _.pick(functionalServices, [
  '__webdriver__',
  'aceEditor',
  'actions',
  'appsMenu',
  'browser',
  'canvasElement',
  'cases',
  'comboBox',
  'selectable',
  'dashboardAddPanel',
  'dashboardBadgeActions',
  'dashboardCustomizePanel',
  'dashboardDrilldownPanelActions',
  'dashboardDrilldownsManage',
  'dashboardExpect',
  'dashboardPanelActions',
  'dashboardReplacePanel',
  'dashboardSettings',
  'dashboardVisualizations',
  'dataGrid',
  'dataStreams',
  'docTable',
  'elasticChart',
  'embedding',
  'failureDebugging',
  'fieldEditor',
  'filterBar',
  'find',
  'flyout',
  'globalNav',
  'inspector',
  'listingTable',
  'managementMenu',
  'menuToggle',
  'ml',
  'monacoEditor',
  'pieChart',
  'pipelineEditor',
  'pipelineList',
  'png',
  'queryBar',
  'random',
  'renderable',
  'reporting',
  'retryOnStale',
  'rules',
  'sampleData',
  'savedObjectsFinder',
  'savedQueryManagementComponent',
  'screenshots',
  'snapshots',
  'supertest',
  'testSubjects',
  'transform',
  'toasts',
  'uptime',
  'usageCollection',
  'userMenu',
  'vegaDebugInspector',
]);

export const services = {
  ...deploymentAgnosticSharedServices,
  ...deploymentAgnosticFunctionalServices,
};
