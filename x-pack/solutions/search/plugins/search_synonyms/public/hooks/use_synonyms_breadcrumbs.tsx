/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import type { ChromeBreadcrumb } from '@kbn/core-chrome-browser';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';

import { useKibana } from './use_kibana';

export const useSynonymsBreadcrumbs = (setName?: string) => {
  const { history, searchNavigation } = useKibana().services;

  useEffect(() => {
    const breadcrumbs: ChromeBreadcrumb[] = [
      {
        text: i18n.translate('xpack.searchSynonyms.breadcrumbs.relevance.title', {
          defaultMessage: 'Relevance',
        }),
      },
    ];
    if (setName) {
      breadcrumbs.push({
        text: i18n.translate('xpack.searchSynonyms.breadcrumbs.synonyms.title', {
          defaultMessage: 'Synonyms',
        }),
        ...reactRouterNavigate(history, '/'),
      });
      breadcrumbs.push({
        text: setName,
      });
    } else {
      breadcrumbs.push({
        text: i18n.translate('xpack.searchSynonyms.breadcrumbs.synonyms.title', {
          defaultMessage: 'Synonyms',
        }),
      });
    }
    searchNavigation?.breadcrumbs.setSearchBreadCrumbs(breadcrumbs);

    return () => {
      // Clear breadcrumbs on unmount;
      searchNavigation?.breadcrumbs.clearBreadcrumbs();
    };
  }, [searchNavigation, history, setName]);
};
