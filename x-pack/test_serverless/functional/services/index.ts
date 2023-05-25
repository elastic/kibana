/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/imports/no_boundary_crossing
import { services as xpackFunctionalServices } from '../../../test/functional/services';
import { services as svlSharedServices } from '../../shared/services';

import { SvlCommonNavigationServiceProvider } from './svl_common_navigation';
import { SvlObltNavigationServiceProvider } from './svl_oblt_navigation';
import { SvlSearchNavigationServiceProvider } from './svl_search_navigation';
import { SvlSecNavigationServiceProvider } from './svl_sec_navigation';

export const services = {
  ...xpackFunctionalServices,
  ...svlSharedServices,

  svlCommonNavigation: SvlCommonNavigationServiceProvider,
  svlObltNavigation: SvlObltNavigationServiceProvider,
  svlSearchNavigation: SvlSearchNavigationServiceProvider,
  svlSecNavigation: SvlSecNavigationServiceProvider,
};
