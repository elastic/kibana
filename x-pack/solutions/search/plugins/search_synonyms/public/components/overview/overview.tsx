/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';

import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderMenu } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { PLUGIN_TITLE } from '../../../common';
import { docLinks } from '../../../common/doc_links';
import { useKibana } from '../../hooks/use_kibana';
import { SynonymSets } from '../synonym_sets/synonym_sets';
import { useFetchSynonymsSets } from '../../hooks/use_fetch_synonyms_sets';
import { useSynonymsBreadcrumbs } from '../../hooks/use_synonyms_breadcrumbs';
import { CreateSynonymsSetModal } from '../synonym_sets/create_new_set_modal';
import { ErrorPrompt } from '../error_prompt/error_prompt';
import { EmptyPrompt } from '../empty_prompt/empty_prompt';
import { isPermissionError } from '../../utils/synonyms_utils';

export const SearchSynonymsOverview = () => {
  const {
    services: { console: consolePlugin, history, searchNavigation },
  } = useKibana();
  const { data: synonymsData, isInitialLoading, isError, error } = useFetchSynonymsSets();
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  useSynonymsBreadcrumbs();

  const embeddableConsole = useMemo(
    () => (consolePlugin?.EmbeddableConsole ? <consolePlugin.EmbeddableConsole /> : null),
    [consolePlugin]
  );

  const menu = useMemo<AppHeaderMenu>(
    () => ({
      primaryActionItem: {
        id: 'createSynonymsSet',
        label: i18n.translate('xpack.searchSynonyms.synonymsSetDetail.createButton', {
          defaultMessage: 'Create',
        }),
        iconType: 'plusCircle',
        testId: 'searchSynonymsSearchSynonymsOverviewCreateButton',
        run: () => {
          setIsCreateModalVisible(true);
        },
      },
    }),
    []
  );

  return (
    <KibanaPageTemplate
      offset={0}
      restrictWidth={false}
      grow={false}
      data-test-subj="searchSynonymsOverviewPage"
      solutionNav={searchNavigation?.useClassicNavigation(history)}
      color="primary"
    >
      {!isInitialLoading && !isError && synonymsData?._meta.totalItemCount !== 0 && (
        <AppHeader
          title={PLUGIN_TITLE}
          description={i18n.translate('xpack.searchSynonyms.synonymsSetDetail.description', {
            defaultMessage: 'Create and manage synonym sets and synonym rules.',
          })}
          menu={menu}
          docLink={docLinks.synonymsApi}
        />
      )}
      <KibanaPageTemplate.Section
        restrictWidth
        contentProps={{
          css: css({
            height: '100%',
          }),
        }}
      >
        {isCreateModalVisible && (
          <CreateSynonymsSetModal
            onClose={() => {
              setIsCreateModalVisible(false);
            }}
          />
        )}
        {isInitialLoading && <EuiLoadingSpinner />}
        {isError && (
          <ErrorPrompt errorType={isPermissionError(error) ? 'missingPermissions' : 'generic'} />
        )}

        {!isInitialLoading && synonymsData && synonymsData._meta.totalItemCount > 0 && (
          <SynonymSets />
        )}
        {!isInitialLoading && synonymsData && synonymsData._meta.totalItemCount === 0 && (
          <EuiFlexGroup
            justifyContent="center"
            alignItems="center"
            direction="column"
            css={css({
              height: '75%',
            })}
          >
            <EuiFlexItem>
              <EmptyPrompt
                getStartedAction={() => {
                  setIsCreateModalVisible(true);
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </KibanaPageTemplate.Section>
      {embeddableConsole}
    </KibanaPageTemplate>
  );
};
