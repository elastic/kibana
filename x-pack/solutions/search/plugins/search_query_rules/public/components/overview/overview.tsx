/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

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
import { css } from '@emotion/react';
import { docLinks } from '../../../common/doc_links';
import { useKibana } from '../../hooks/use_kibana';
import { useFetchQueryRulesSets } from '../../hooks/use_fetch_query_rules_sets';
import { EmptyPrompt } from '../empty_prompt/empty_prompt';
import { ErrorPrompt } from '../error_prompt/error_prompt';
import { isPermissionError } from '../../utils/query_rules_utils';
import queryRulesBackground from '../../assets/query-rule-background.svg';
import { QueryRulesSets } from '../query_rules_sets/query_rules_sets';

export const QueryRulesOverview = () => {
  const {
    services: { console: consolePlugin, history, searchNavigation },
  } = useKibana();
  const { data: queryRulesData, isInitialLoading, isError, error } = useFetchQueryRulesSets();

  const embeddableConsole = useMemo(
    () => (consolePlugin?.EmbeddableConsole ? <consolePlugin.EmbeddableConsole /> : null),
    [consolePlugin]
  );
  const backgroundProps = css({
    backgroundImage: `url(${queryRulesBackground})`,
    backgroundSize: 'contain',
    backgroundRepeat: 'no-repeat',
    height: '100%',
    width: '100%',
    justifyItems: 'center',
    alignContent: 'center',
    backgroundPosition: 'center center',
  });
  return (
    <KibanaPageTemplate
      offset={0}
      restrictWidth={false}
      grow={false}
      data-test-subj="queryRulesOverviewPage"
      solutionNav={searchNavigation?.useClassicNavigation(history)}
      color="primary"
    >
      {!isInitialLoading && !isError && queryRulesData?._meta.totalItemCount !== 0 && (
        <KibanaPageTemplate.Header
          pageTitle="Query Rules"
          restrictWidth
          color="primary"
          rightSideItems={[
            <EuiFlexGroup alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiLink
                  data-test-subj="queryRulesOverviewApiDocumentationLink"
                  external
                  target="_blank"
                  href={docLinks.queryRulesApi}
                >
                  <FormattedMessage
                    id="xpack.queryRules.queryRulesSetDetail.documentationLink"
                    defaultMessage="API Documentation"
                  />
                </EuiLink>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="queryRulesOverviewCreateButton"
                  fill
                  iconType="plusInCircle"
                  onClick={() => {
                    // Logic to create a new query rule set
                  }}
                >
                  <FormattedMessage
                    id="xpack.queryRules.queryRulesSetDetail.createButton"
                    defaultMessage="Create"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>,
          ]}
        >
          <EuiText>
            <FormattedMessage
              id="xpack.queryRules.queryRulesSetDetail.description"
              defaultMessage="Create and manage query rules sets."
            />
          </EuiText>
        </KibanaPageTemplate.Header>
      )}
      <KibanaPageTemplate.Section
        restrictWidth
        contentProps={{
          css:
            !isInitialLoading && !isError && queryRulesData?._meta.totalItemCount !== 0
              ? undefined
              : backgroundProps,
        }}
      >
        {isInitialLoading && <EuiLoadingSpinner />}
        {isError && (
          <ErrorPrompt errorType={isPermissionError(error) ? 'missingPermissions' : 'generic'} />
        )}
        {!isInitialLoading && queryRulesData && queryRulesData._meta.totalItemCount > 0 && (
          <QueryRulesSets />
        )}
        {!isInitialLoading && queryRulesData && queryRulesData._meta.totalItemCount === 0 && (
          <EuiFlexGroup justifyContent="center" alignItems="center" direction="column">
            <EuiFlexItem>
              <EmptyPrompt
                getStartedAction={() => {
                  // Logic to create a new query rule set
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
