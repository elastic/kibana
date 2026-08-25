/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';

import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiEmptyPrompt, EuiIllustration, EuiButton, EuiLink, EuiTitle } from '@elastic/eui';
import { highFive } from '@elastic/eui-illustrations';
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
import { isPermissionError } from '../../utils/synonyms_utils';
import { FormattedMessage } from '@kbn/i18n-react';

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

              <EuiEmptyPrompt
                layout="horizontal"
                color="plain"
                icon={
                  <EuiIllustration
                    type={highFive}
                    alt=""
                    style={{ maxInlineSize: 240, marginInline: 'auto' }}
                  />
                }
                title={
                  <h2 style={{ whiteSpace: 'nowrap' }}>
                    <FormattedMessage
                      id="xpack.searchSynonyms.emptyPrompt.title"
                      defaultMessage="Search with synonyms"
                    />
                  </h2>
                }
                body={<p>
                  <FormattedMessage
                    id="xpack.searchSynonyms.emptyPrompt.subtitle"
                    defaultMessage="Create and manage Elasticsearch synonym sets and rules, which expand search results by matching different terms that express the same concept."
                  />
                </p>}
                actions={
                  <EuiButton color="primary" fill iconType="plusCircle" iconSide="left" onClick={() => {
                    setIsCreateModalVisible(true);
                  }}>

                    <FormattedMessage
                      id="xpack.searchSynonyms.emptyPrompt.getStartedButton"
                      defaultMessage="Create a synonym set"
                    />
                  </EuiButton>
                }
                footer={
                  <>
                    <EuiTitle size="xxs">
                      <span>
                        <FormattedMessage
                          id="xpack.searchSynonyms.emptyPrompt.footer"
                          defaultMessage="Prefer to use the APIs?"
                        />
                      </span>
                    </EuiTitle>{' '}
                    <EuiLink
                      data-test-subj="searchSynonymsEmptyPromptFooterLink"
                      href={docLinks.synonymsApi}
                      target="_blank"
                      external
                    >
                      <FormattedMessage
                        id="xpack.searchSynonyms.emptyPrompt.footerLink"
                        defaultMessage="View documentation"
                      />
                    </EuiLink>
                  </>
                }

              />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </KibanaPageTemplate.Section>
      {embeddableConsole}
    </KibanaPageTemplate>
  );
};
