/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SvlCommonNavigationServiceProvider } from '@kbn/test-suites-xpack-platform/serverless/functional/services/svl_common_navigation';
import { SvlCommonScreenshotsProvider } from '@kbn/test-suites-xpack-platform/serverless/functional/services/svl_common_screenshots';
import { UISettingsServiceProvider } from '@kbn/test-suites-xpack-platform/serverless/functional/services/ui_settings';
import { MachineLearningProvider } from '@kbn/test-suites-xpack-platform/serverless/functional/services/ml';
import { LogsSynthtraceProvider } from '@kbn/test-suites-xpack-platform/serverless/functional/services/log';
import { ComboBoxService } from '@kbn/test-suites-src/functional/services/combo_box';
import { services as deploymentAgnosticFunctionalServices } from './deployment_agnostic_services';
import { services as svlSharedServices } from '../../shared/services';
import { SvlCasesServiceProvider } from '../../api_integration/services/svl_cases';
import { services as SvlApiIntegrationSvcs } from '../../api_integration/services';

export const services = {
  // deployment agnostic FTR services
  ...deploymentAgnosticFunctionalServices,

  // serverless FTR services
  ...svlSharedServices,
  svlCommonNavigation: SvlCommonNavigationServiceProvider,
  svlCommonScreenshots: SvlCommonScreenshotsProvider,
  svlCases: SvlCasesServiceProvider,
  svlMl: MachineLearningProvider,
  uiSettings: UISettingsServiceProvider,
  // log services
  svlLogsSynthtraceClient: LogsSynthtraceProvider,
  alertingApi: SvlApiIntegrationSvcs.alertingApi,
  // EUI components
  comboBox: ComboBoxService,
};
