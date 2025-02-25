/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChromeBreadcrumb } from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../hooks/use_kibana';

export const IndexManagementBreadcrumbs = (): ChromeBreadcrumb[] => {
  const { http } = useKibana().services;

  return [
    {
      text: i18n.translate('xpack.searchIndices.breadcrumbs.indexManagement.label', {
        defaultMessage: 'Index Management',
      }),
      href: http.basePath.prepend('/app/elasticsearch/index_management'),
    },
    {
      text: i18n.translate('xpack.searchIndices.breadcrumbs.indexManagement.indices.label', {
        defaultMessage: 'Indices',
      }),
      href: http.basePath.prepend(`/app/elasticsearch/index_management/indices`),
    },
  ];
};
