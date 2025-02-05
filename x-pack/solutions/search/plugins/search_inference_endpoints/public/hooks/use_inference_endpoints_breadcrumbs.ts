/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';

import * as i18n from '../../common/translations';
import { useKibana } from './use_kibana';

export const useInferenceEndpointsBreadcrumbs = () => {
  const { searchNavigation } = useKibana().services;

  useEffect(() => {
    searchNavigation?.breadcrumbs.setSearchBreadCrumbs(
      [{ text: i18n.BREADCRUMB_RELEVANCE }, { text: i18n.BREADCRUMB_INFERENCE_ENDPOINTS }],
      { forClassicChromeStyle: true }
    );

    return () => {
      // Clear breadcrumbs on unmount;
      searchNavigation?.breadcrumbs.clearBreadcrumbs();
    };
  }, [searchNavigation]);
};
