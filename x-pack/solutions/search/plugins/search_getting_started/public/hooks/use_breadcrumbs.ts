/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';

import { PLUGIN_NAME } from '../../common';
import { useKibana } from './use_kibana';

export const useGettingStartedBreadcrumbs = () => {
  const { cloud, http, searchNavigation } = useKibana().services;
  const isServerless = cloud?.isServerlessEnabled ?? false;

  useEffect(() => {
    searchNavigation?.breadcrumbs.setSearchBreadCrumbs(
      isServerless
        ? []
        : [
            {
              text: PLUGIN_NAME,
            },
          ]
    );

    return () => {
      // Clear breadcrumbs on unmount;
      searchNavigation?.breadcrumbs.clearBreadcrumbs();
    };
  }, [http, searchNavigation, isServerless]);
};
