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
import { generateRandomIndexName } from '../../utils/indices';
import { useUserPrivilegesQuery } from '../../hooks/api/use_user_permissions';
import { useIndicesStatusQuery } from '../../hooks/api/use_indices_status';

import { useIndicesRedirect } from './hooks/use_indices_redirect';
import { ElasticsearchStart } from './elasticsearch_start';
import { LoadIndicesStatusError } from '../shared/load_indices_status_error';
import { usePageChrome } from '../../hooks/use_page_chrome';

const PageTitle = i18n.translate('xpack.searchIndices.startPage.docTitle', {
  defaultMessage: 'Create your first index',
});

export const ElasticsearchStartPage = () => {
  const { console: consolePlugin, history, searchNavigation } = useKibana().services;
  const indexName = useMemo(() => generateRandomIndexName(), []);
  const { data: userPrivileges } = useUserPrivilegesQuery(indexName);
  const {
    data: indicesData,
    isInitialLoading,
    isError: hasIndicesStatusFetchError,
    error: indicesFetchError,
  } = useIndicesStatusQuery();

  usePageChrome(
    PageTitle,
    [
      {
        text: PageTitle,
      },
    ],
    false
  );

  const embeddableConsole = useMemo(
    () => (consolePlugin?.EmbeddableConsole ? <consolePlugin.EmbeddableConsole /> : null),
    [consolePlugin]
  );

  useIndicesRedirect(indicesData, userPrivileges);

  return (
    <KibanaPageTemplate
      offset={0}
      restrictWidth={false}
      data-test-subj="elasticsearchStartPage"
      grow={false}
      solutionNav={searchNavigation?.useClassicNavigation(history)}
    >
      <KibanaPageTemplate.Section alignment="top" restrictWidth={false} grow>
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
