/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';

import { i18n } from '@kbn/i18n';

import { PLUGIN_PATH } from '../../common';
import { useKibana } from './use_kibana';

export const usePlaygroundBreadcrumbs = (playgroundName?: string) => {
  const { http, searchNavigation } = useKibana().services;

  useEffect(() => {
    searchNavigation?.breadcrumbs.setSearchBreadCrumbs([
      // TODO: confirm how this behaves with classic navigation
      // {
      //   text: i18n.translate('xpack.searchPlayground.breadcrumbs.build', {
      //     defaultMessage: 'Build',
      //   }),
      // },
      {
        text: i18n.translate('xpack.searchPlayground.breadcrumbs.playground', {
          defaultMessage: 'Playground',
        }),
        href: playgroundName !== undefined ? http.basePath.prepend(PLUGIN_PATH) : undefined,
      },
      ...(playgroundName !== undefined
        ? [
            {
              text: playgroundName,
            },
          ]
        : []),
    ]);

    return () => {
      // Clear breadcrumbs on unmount;
      searchNavigation?.breadcrumbs.clearBreadcrumbs();
    };
  }, [http, searchNavigation, playgroundName]);
};
