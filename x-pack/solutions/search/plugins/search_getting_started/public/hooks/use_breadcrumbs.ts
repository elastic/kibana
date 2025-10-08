/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';

import { i18n } from '@kbn/i18n';

import { useKibana } from './use_kibana';

export const useGettingStartedBreadcrumbs = () => {
  const { cloud, http, searchNavigation } = useKibana().services;
  const isServerless = cloud?.isServerlessEnabled ?? false;

  useEffect(() => {
    searchNavigation?.breadcrumbs.setSearchBreadCrumbs([
      {
        text: i18n.translate('xpack.search.gettingStarted.breadcrumbs', {
          defaultMessage: 'Getting Startedss',
        }),
        href: '/app/elasticsearch/getting_started',
      },
    ]);

    return () => {
      // Clear breadcrumbs on unmount;
      searchNavigation?.breadcrumbs.clearBreadcrumbs();
    };
  }, [http, searchNavigation, isServerless]);
};
