/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { EuiLoadingLogo } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

import { useIndicesStatusQuery } from '../../hooks/api/use_indices_status';
import { useKibana } from '../../hooks/use_kibana';
import { usePageChrome } from '../../hooks/use_page_chrome';
import { IndexManagementBreadcrumbs } from '../shared/breadcrumbs';
import { LoadIndicesStatusError } from '../shared/load_indices_status_error';

import { CreateIndex } from './create_index';

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
  usePageChrome(CreateIndexLabel, [...IndexManagementBreadcrumbs, { text: CreateIndexLabel }]);

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
