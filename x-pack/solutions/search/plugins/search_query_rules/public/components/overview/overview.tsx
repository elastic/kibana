/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { docLinks } from '../../../common/doc_links';
import { useFetchQueryRulesSets } from '../../hooks/use_fetch_query_rules_sets';
import { EmptyPrompt } from '../empty_prompt/empty_prompt';
import { ErrorPrompt } from '../error_prompt/error_prompt';
import { isPermissionError } from '../../utils/query_rules_utils';
import queryRulesBackground from '../../assets/query-rule-background.svg';
import queryRulesBackgroundDark from '../../assets/query-rule-background-dark.svg';
import { QueryRulesSets } from '../query_rules_sets/query_rules_sets';
import { CreateRulesetModal } from './create_ruleset_modal';

import { QueryRulesPageTemplate } from '../../layout/query_rules_page_template';
import { useUsageTracker } from '../../hooks/use_usage_tracker';
import { AnalyticsEvents } from '../../analytics/constants';

export const QueryRulesOverview = () => {
  const usageTracker = useUsageTracker();
  const { colorMode } = useEuiTheme();

  const { data: queryRulesData, isInitialLoading, isError, error } = useFetchQueryRulesSets();
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);

  const backgroundProps = css({
    backgroundImage: `url(${
      colorMode === 'DARK' ? queryRulesBackgroundDark : queryRulesBackground
    })`,
    backgroundSize: 'contain',
    backgroundRepeat: 'no-repeat',
    height: '100%',
    width: '100%',
    justifyItems: 'center',
    alignContent: 'center',
    backgroundPosition: 'center center',
  });

  return (
    <QueryRulesPageTemplate restrictWidth={false}>
      {!isInitialLoading && !isError && queryRulesData?._meta.totalItemCount !== 0 && (
        <KibanaPageTemplate.Header
          pageTitle="Query Rules"
          restrictWidth
          color="primary"
          rightSideItems={[
            <EuiFlexGroup alignItems="center" key="queryRulesOverviewHeaderButtons">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="queryRulesetDetailApiReferenceButton"
                  iconType="documentation"
                  color="text"
                  aria-label={i18n.translate(
                    'xpack.queryRules.queryRulesetDetail.apiReferenceButton',
                    {
                      defaultMessage: 'API reference',
                    }
                  )}
                  href={docLinks.queryRulesApi}
                  target="_blank"
                >
                  {i18n.translate('xpack.queryRules.queryRulesetDetail.apiReferenceButton', {
                    defaultMessage: 'API reference',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="queryRulesOverviewCreateButton"
                  fill
                  iconType="plusInCircle"
                  onClick={() => {
                    usageTracker?.click(AnalyticsEvents.addRulesetClicked);
                    setIsCreateModalVisible(true);
                  }}
                >
                  <FormattedMessage
                    id="xpack.queryRules.queryRulesSetDetail.createButton"
                    defaultMessage="Create ruleset"
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
        {isCreateModalVisible && (
          <CreateRulesetModal
            onClose={() => {
              setIsCreateModalVisible(false);
            }}
          />
        )}
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
                  usageTracker?.click(AnalyticsEvents.gettingStartedButtonClicked);
                  setIsCreateModalVisible(true);
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </KibanaPageTemplate.Section>
    </QueryRulesPageTemplate>
  );
};
