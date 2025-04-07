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
import { LoadIndicesStatusError } from '../shared/load_indices_status_error';

import { CreateIndex } from './create_index';
import { usePageChrome } from '../../hooks/use_page_chrome';
import { useIndexManagementBreadcrumbs } from '../../hooks/use_index_management_breadcrumbs';

const CreateIndexLabel = i18n.translate('xpack.searchIndices.createIndex.docTitle', {
  defaultMessage: 'Create Index',
});

export const CreateIndexPage = () => {
  const { console: consolePlugin, history, searchNavigation } = useKibana().services;
  const {
    data: indicesData,
    isInitialLoading,
    isError: hasIndicesStatusFetchError,
    error: indicesFetchError,
  } = useIndicesStatusQuery();

  const embeddableConsole = useMemo(
    () => (consolePlugin?.EmbeddableConsole ? <consolePlugin.EmbeddableConsole /> : null),
    [consolePlugin]
  );
  const indexManagementBreadcrumbs = useIndexManagementBreadcrumbs();
  usePageChrome(CreateIndexLabel, [
    ...indexManagementBreadcrumbs,
    {
      text: CreateIndexLabel,
    },
  ]);

  return (
    <KibanaPageTemplate
      offset={0}
      restrictWidth={false}
      data-test-subj="elasticsearchCreateIndexPage"
      grow={false}
      solutionNav={searchNavigation?.useClassicNavigation(history)}
    >
      <KibanaPageTemplate.Section alignment="top" restrictWidth={false}>
        {isInitialLoading && <EuiLoadingLogo />}
        {hasIndicesStatusFetchError && <LoadIndicesStatusError error={indicesFetchError} />}
        {!isInitialLoading && !hasIndicesStatusFetchError && (
          <CreateIndex indicesData={indicesData} />
        )}
      </KibanaPageTemplate.Section>
      {embeddableConsole}
    </KibanaPageTemplate>
  );
};
