/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from '@kbn/rison';

import type { FilterControlConfig } from '@kbn/alerts-ui-shared';
import { SecurityPageName } from '../../../common/constants';
import { formatPageFilterSearchParam } from '../../../common/utils/format_page_filter_search_param';
import { useNavigation } from '../lib/kibana';
import { URL_PARAM_KEY } from './use_url_state';

export const useNavigateToAlertsPageWithFilters = () => {
  const { navigateTo } = useNavigation();

  return (
    /**
     * Pass one or more filter control configurations to be applied to the alerts page filters
     */
    filterItems: FilterControlConfig | FilterControlConfig[],
    /**
     * If true, the alerts page will be opened in a new tab
     */
    openInNewTab = false,
    /**
     * Allows to customize the timerange url parameter. Should only be used in combination with the openInNewTab=true parameter
     */
    timerange?: string
  ) => {
    const urlFilterParams = encode(
      formatPageFilterSearchParam(Array.isArray(filterItems) ? filterItems : [filterItems])
    );
    const timerangePath = timerange ? `&timerange=${timerange}` : '';
    navigateTo({
      deepLinkId: SecurityPageName.alerts,
      path: `?${URL_PARAM_KEY.pageFilter}=${urlFilterParams}${timerangePath}`,
      openInNewTab,
    });
  };
};
