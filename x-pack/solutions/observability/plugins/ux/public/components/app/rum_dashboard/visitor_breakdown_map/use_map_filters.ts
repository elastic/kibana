/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { FieldFilter as Filter } from '@kbn/es-query';
import { getStaticDataViewId } from '@kbn/apm-data-view';
import { useLegacyUrlParams } from '../../../../context/url_params_context/use_url_params';
import {
  CLIENT_GEO_COUNTRY_ISO_CODE,
  SERVICE_NAME,
  TRANSACTION_URL,
  USER_AGENT_DEVICE,
  USER_AGENT_NAME,
  USER_AGENT_OS,
} from '../../../../../common/elasticsearch_fieldnames';
import { useUxPluginContext } from '../../../../context/use_ux_plugin_context';

const getWildcardFilter = (field: string, value: string, spaceId: string): Filter => {
  return {
    meta: {
      index: getStaticDataViewId(spaceId),
      alias: null,
      negate: false,
      disabled: false,
      type: 'term',
      key: field,
      params: { query: value },
    },
    query: { wildcard: { [field]: { value: `*${value}*` } } },
  };
};

const getMatchFilter = (field: string, value: string, spaceId: string): Filter => {
  return {
    meta: {
      index: getStaticDataViewId(spaceId),
      alias: null,
      negate: false,
      disabled: false,
      type: 'phrase',
      key: field,
      params: { query: value },
    },
    query: { term: { [field]: value } },
  };
};

const getMultiMatchFilter = (
  field: string,
  values: string[],
  spaceId: string,
  negate = false
): Filter => {
  return {
    meta: {
      index: getStaticDataViewId(spaceId),
      type: 'phrases',
      key: field,
      value: values.join(', '),
      params: values,
      alias: null,
      negate,
      disabled: false,
    },
    query: {
      bool: {
        should: values.map((value) => ({ match_phrase: { [field]: value } })),
        minimum_should_match: 1,
      },
    },
  };
};

function getExistFilter(spaceId: string): Filter {
  return {
    meta: {
      index: getStaticDataViewId(spaceId),
      alias: null,
      negate: false,
      disabled: false,
      type: 'exists',
      key: 'transaction.marks.navigationTiming.fetchStart',
      value: 'exists',
    },
    query: {
      exists: {
        field: 'transaction.marks.navigationTiming.fetchStart',
      },
    },
  };
}

export const useMapFilters = (): Filter[] => {
  const { urlParams, uxUiFilters } = useLegacyUrlParams();
  const { spaceId } = useUxPluginContext();

  const { serviceName, searchTerm } = urlParams;

  const {
    browser,
    device,
    os,
    location,
    transactionUrl,
    browserExcluded,
    deviceExcluded,
    osExcluded,
    locationExcluded,
    transactionUrlExcluded,
  } = uxUiFilters;

  return useMemo(() => {
    const filters: Filter[] = [getExistFilter(spaceId)];
    if (serviceName) {
      filters.push(getMatchFilter(SERVICE_NAME, serviceName, spaceId));
    }
    if (browser) {
      filters.push(getMultiMatchFilter(USER_AGENT_NAME, browser, spaceId));
    }
    if (device) {
      filters.push(getMultiMatchFilter(USER_AGENT_DEVICE, device, spaceId));
    }
    if (os) {
      filters.push(getMultiMatchFilter(USER_AGENT_OS, os, spaceId));
    }
    if (location) {
      filters.push(getMultiMatchFilter(CLIENT_GEO_COUNTRY_ISO_CODE, location, spaceId));
    }
    if (transactionUrl) {
      filters.push(getMultiMatchFilter(TRANSACTION_URL, transactionUrl, spaceId));
    }
    if (browserExcluded) {
      filters.push(getMultiMatchFilter(USER_AGENT_NAME, browserExcluded, spaceId, true));
    }
    if (deviceExcluded) {
      filters.push(getMultiMatchFilter(USER_AGENT_DEVICE, deviceExcluded, spaceId, true));
    }
    if (osExcluded) {
      filters.push(getMultiMatchFilter(USER_AGENT_OS, osExcluded, spaceId, true));
    }
    if (locationExcluded) {
      filters.push(
        getMultiMatchFilter(CLIENT_GEO_COUNTRY_ISO_CODE, locationExcluded, spaceId, true)
      );
    }
    if (transactionUrlExcluded) {
      filters.push(getMultiMatchFilter(TRANSACTION_URL, transactionUrlExcluded, spaceId, true));
    }
    if (searchTerm) {
      filters.push(getWildcardFilter(TRANSACTION_URL, searchTerm, spaceId));
    }

    return filters;
  }, [
    serviceName,
    browser,
    device,
    os,
    location,
    transactionUrl,
    browserExcluded,
    deviceExcluded,
    osExcluded,
    locationExcluded,
    transactionUrlExcluded,
    searchTerm,
    spaceId,
  ]);
};
