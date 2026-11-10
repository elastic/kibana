/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { OverviewFilterName } from '../../../../../common/overview_filters';
import { APPLICATION_OVERVIEW_EBT_ELEMENTS } from '../../../../ebt_constants';

export const FILTER_LABELS: Record<OverviewFilterName, string> = {
  browser: i18n.translate('xpack.digitalExperience.overview.filters.browserLabel', {
    defaultMessage: 'Browser',
  }),
  os: i18n.translate('xpack.digitalExperience.overview.filters.osLabel', {
    defaultMessage: 'OS',
  }),
  device: i18n.translate('xpack.digitalExperience.overview.filters.deviceLabel', {
    defaultMessage: 'Device',
  }),
  country: i18n.translate('xpack.digitalExperience.overview.filters.countryLabel', {
    defaultMessage: 'Country',
  }),
  appVersion: i18n.translate('xpack.digitalExperience.overview.filters.appVersionLabel', {
    defaultMessage: 'App version',
  }),
  pageUrl: i18n.translate('xpack.digitalExperience.overview.filters.pageLabel', {
    defaultMessage: 'Page',
  }),
  pageContains: i18n.translate('xpack.digitalExperience.overview.filters.pageContainsLabel', {
    defaultMessage: 'URL contains',
  }),
};

export const FILTER_EBT_ELEMENTS: Record<OverviewFilterName, string> = {
  browser: APPLICATION_OVERVIEW_EBT_ELEMENTS.BROWSER_FILTER,
  os: APPLICATION_OVERVIEW_EBT_ELEMENTS.OS_FILTER,
  device: APPLICATION_OVERVIEW_EBT_ELEMENTS.DEVICE_FILTER,
  country: APPLICATION_OVERVIEW_EBT_ELEMENTS.COUNTRY_FILTER,
  appVersion: APPLICATION_OVERVIEW_EBT_ELEMENTS.APP_VERSION_FILTER,
  pageUrl: APPLICATION_OVERVIEW_EBT_ELEMENTS.PAGE_FILTER,
  pageContains: APPLICATION_OVERVIEW_EBT_ELEMENTS.PAGE_CONTAINS_FILTER,
};
