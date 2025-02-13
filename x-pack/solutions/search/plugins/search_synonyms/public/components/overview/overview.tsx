/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';

import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { docLinks } from '../../../common/doc_links';
import { useKibana } from '../../hooks/use_kibana';
import { SynonymSets } from '../synonym_sets/synonym_sets';
import { useFetchSynonymsSets } from '../../hooks/use_fetch_synonyms_sets';
import { EmptyPrompt } from '../empty_prompt/empty_prompt';
import { CreateSynonymsSetModal } from '../synonym_sets/create_new_set_modal';

export const SearchSynonymsOverview = () => {
  const {
    services: { console: consolePlugin, history, searchNavigation },
  } = useKibana();
  const { data: synonymsData, isInitialLoading } = useFetchSynonymsSets();
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);

  const embeddableConsole = useMemo(
    () => (consolePlugin?.EmbeddableConsole ? <consolePlugin.EmbeddableConsole /> : null),
    [consolePlugin]
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
      <KibanaPageTemplate.Header
        pageTitle="Synonyms"
        restrictWidth
        color="primary"
        rightSideItems={[
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiLink
                data-test-subj="searchSynonymsSearchSynonymsOverviewApiDocumentationLink"
                external
                target="_blank"
                href={docLinks.synonymsApi}
              >
                <FormattedMessage
                  id="xpack.searchSynonyms.synonymsSetDetail.documentationLink"
                  defaultMessage="API Documentation"
                />
              </EuiLink>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="searchSynonymsSearchSynonymsOverviewCreateButton"
                fill
                iconType="plusInCircle"
                onClick={() => {
                  setIsCreateModalVisible(true);
                }}
              >
                <FormattedMessage
                  id="xpack.searchSynonyms.synonymsSetDetail.createButton"
                  defaultMessage="Create"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>,
        ]}
      >
        <EuiText>
          <FormattedMessage
            id="xpack.searchSynonyms.synonymsSetDetail.description"
            defaultMessage="Create and manage synonym sets and synonym rules."
          />
        </EuiText>
      </KibanaPageTemplate.Header>
      <KibanaPageTemplate.Section restrictWidth>
        {isCreateModalVisible && (
          <CreateSynonymsSetModal
            onClose={() => {
              setIsCreateModalVisible(false);
            }}
          />
        )}
        {isInitialLoading && <EuiLoadingSpinner />}

        {!isInitialLoading && synonymsData && synonymsData._meta.totalItemCount > 0 && (
          <SynonymSets />
        )}
        {!isInitialLoading && synonymsData && synonymsData._meta.totalItemCount === 0 && (
          <EmptyPrompt
            getStartedAction={() => {
              setIsCreateModalVisible(true);
            }}
          />
        )}
      </KibanaPageTemplate.Section>
      {embeddableConsole}
    </KibanaPageTemplate>
  );
};
