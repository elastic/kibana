/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  ATTR_CLIENT_GEO_COUNTRY_ISO_CODE,
  ATTR_SERVICE_NAME,
  ATTR_TRANSACTION_URL,
  ATTR_USER_AGENT_DEVICE_NAME,
  ATTR_USER_AGENT_NAME,
  ATTR_USER_AGENT_OS_NAME,
} from '@kbn/observability-ui-semantic-conventions';

export const uxFiltersByName = {
  transactionUrl: {
    title: i18n.translate('xpack.ux.localFilters.titles.transactionUrl', {
      defaultMessage: 'URL',
    }),
    fieldName: ATTR_TRANSACTION_URL,
  },
  transactionUrlExcluded: {
    title: i18n.translate('xpack.ux.localFilters.titles.transactionUrl', {
      defaultMessage: 'URL',
    }),
    fieldName: ATTR_TRANSACTION_URL,
    excluded: true,
  },
  browser: {
    title: i18n.translate('xpack.ux.localFilters.titles.browser', {
      defaultMessage: 'Browser',
    }),
    fieldName: ATTR_USER_AGENT_NAME,
  },
  browserExcluded: {
    title: i18n.translate('xpack.ux.localFilters.titles.browser', {
      defaultMessage: 'Browser',
    }),
    fieldName: ATTR_USER_AGENT_NAME,
    excluded: true,
  },
  device: {
    title: i18n.translate('xpack.ux.localFilters.titles.device', {
      defaultMessage: 'Device',
    }),
    fieldName: ATTR_USER_AGENT_DEVICE_NAME,
  },
  deviceExcluded: {
    title: i18n.translate('xpack.ux.localFilters.titles.device', {
      defaultMessage: 'Device',
    }),
    fieldName: ATTR_USER_AGENT_DEVICE_NAME,
    excluded: true,
  },
  location: {
    title: i18n.translate('xpack.ux.localFilters.titles.location', {
      defaultMessage: 'Location',
    }),
    fieldName: ATTR_CLIENT_GEO_COUNTRY_ISO_CODE,
  },
  locationExcluded: {
    title: i18n.translate('xpack.ux.localFilters.titles.location', {
      defaultMessage: 'Location',
    }),
    fieldName: ATTR_CLIENT_GEO_COUNTRY_ISO_CODE,
    excluded: true,
  },
  os: {
    title: i18n.translate('xpack.ux.localFilters.titles.os', {
      defaultMessage: 'OS',
    }),
    fieldName: ATTR_USER_AGENT_OS_NAME,
  },
  osExcluded: {
    title: i18n.translate('xpack.ux.localFilters.titles.os', {
      defaultMessage: 'OS',
    }),
    fieldName: ATTR_USER_AGENT_OS_NAME,
    excluded: true,
  },
  serviceName: {
    title: i18n.translate('xpack.ux.localFilters.titles.serviceName', {
      defaultMessage: 'Service name',
    }),
    fieldName: ATTR_SERVICE_NAME,
  },
};

export type UxLocalUIFilterName = keyof typeof uxFiltersByName;

export interface UxLocalUIFilter {
  name: UxLocalUIFilterName;
  title: string;
  fieldName: string;
  excluded?: boolean;
  value: string[];
}

type UxLocalUIFilterMap = {
  [key in UxLocalUIFilterName]: UxLocalUIFilter;
};

export const uxLocalUIFilterNames = Object.keys(uxFiltersByName) as UxLocalUIFilterName[];

export const uxLocalUIFilters = uxLocalUIFilterNames.reduce((acc, key) => {
  const field = uxFiltersByName[key];

  return {
    ...acc,
    [key]: {
      ...field,
      name: key,
    },
  };
}, {} as UxLocalUIFilterMap);
