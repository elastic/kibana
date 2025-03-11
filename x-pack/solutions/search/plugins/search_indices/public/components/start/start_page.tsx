/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';

import { EuiLoadingLogo } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

import { useKibana } from '../../hooks/use_kibana';
import { useIndicesStatusQuery } from '../../hooks/api/use_indices_status';

import { useIndicesRedirect } from './hooks/use_indices_redirect';
import { ElasticsearchStart } from './elasticsearch_start';
import { LoadIndicesStatusError } from '../shared/load_indices_status_error';
import { IndexManagementBreadcrumbs } from '../shared/breadcrumbs';
import { usePageChrome } from '../../hooks/use_page_chrome';

const PageTitle = i18n.translate('xpack.searchIndices.startPage.docTitle', {
  defaultMessage: 'Create your first index',
});

export const ElasticsearchStartPage = () => {
  const { console: consolePlugin, history, searchNavigation } = useKibana().services;
  const {
    data: indicesData,
    isInitialLoading,
    isError: hasIndicesStatusFetchError,
    error: indicesFetchError,
  } = useIndicesStatusQuery();

  usePageChrome(PageTitle, [...IndexManagementBreadcrumbs, { text: PageTitle }]);

  const embeddableConsole = useMemo(
    () => (consolePlugin?.EmbeddableConsole ? <consolePlugin.EmbeddableConsole /> : null),
    [consolePlugin]
  );
  useIndicesRedirect(indicesData);

  return (
    <KibanaPageTemplate
      offset={0}
      restrictWidth={false}
      data-test-subj="elasticsearchStartPage"
      grow={false}
      solutionNav={searchNavigation?.useClassicNavigation(history)}
    >
      <KibanaPageTemplate.Section alignment="center" restrictWidth={false} grow>
        {isInitialLoading && <EuiLoadingLogo />}
        {hasIndicesStatusFetchError && <LoadIndicesStatusError error={indicesFetchError} />}
        {!isInitialLoading && !hasIndicesStatusFetchError && (
          <ElasticsearchStart indicesData={indicesData} />
        )}
      </KibanaPageTemplate.Section>
      {embeddableConsole}
    </KibanaPageTemplate>
  );
};
