/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core-lifecycle-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useCallback } from 'react';
import { CspClientPluginStartDeps } from '../types';
import { NavFilter, encodeQueryUrl, composeQueryFilters } from '../utils/query_utils';

export const useGetNavigationUrlParams = () => {
  const { services } = useKibana<CoreStart & CspClientPluginStartDeps>();

  const getNavUrlParams = useCallback(
    (
      filterParams: NavFilter = {},
      findingsType?: 'configurations' | 'vulnerabilities',
      groupBy?: string[]
    ) => {
      const filters = composeQueryFilters(filterParams);

      const searchParams = new URLSearchParams(encodeQueryUrl(services.data, filters, groupBy));

      return `${findingsType ? findingsType : ''}?${searchParams.toString()}`;
    },
    [services.data]
  );

  return getNavUrlParams;
};
