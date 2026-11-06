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
  pageUrl: i18n.translate('xpack.digitalExperience.overview.filters.pageLabel', {
    defaultMessage: 'Page',
  }),
};

export const FILTER_EBT_ELEMENTS: Record<OverviewFilterName, string> = {
  browser: APPLICATION_OVERVIEW_EBT_ELEMENTS.BROWSER_FILTER,
  os: APPLICATION_OVERVIEW_EBT_ELEMENTS.OS_FILTER,
  device: APPLICATION_OVERVIEW_EBT_ELEMENTS.DEVICE_FILTER,
  country: APPLICATION_OVERVIEW_EBT_ELEMENTS.COUNTRY_FILTER,
  pageUrl: APPLICATION_OVERVIEW_EBT_ELEMENTS.PAGE_FILTER,
};
