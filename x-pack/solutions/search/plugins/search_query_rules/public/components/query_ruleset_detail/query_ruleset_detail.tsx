/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { useParams } from 'react-router-dom';
import { PLUGIN_ROUTE_ROOT } from '../../../common/api_routes';
import { useKibana } from '../../hooks/use_kibana';
import { QueryRulesPageTemplate } from '../../layout/query_rules_page_template';
import { isNotFoundError, isPermissionError } from '../../utils/query_rules_utils';
import { ErrorPrompt } from '../error_prompt/error_prompt';
import { QueryRuleDetailPanel } from './query_rule_detail_panel';
import { useQueryRulesetDetailState } from './use_query_ruleset_detail_state';

export const QueryRulesetDetail: React.FC = () => {
  const {
    services: { application, http },
  } = useKibana();
  const { rulesetId = '' } = useParams<{
    rulesetId?: string;
  }>();

  const { queryRuleset, isInitialLoading, isError, error } = useQueryRulesetDetailState({
    rulesetId,
  });

  return (
    <QueryRulesPageTemplate>
      {!isInitialLoading && !isError && !!queryRuleset && (
        <KibanaPageTemplate.Header
          pageTitle={rulesetId}
          breadcrumbs={[
            {
              text: (
                <>
                  <EuiIcon size="s" type="arrowLeft" />{' '}
                  {i18n.translate('xpack.queryRules.queryRulesetDetail.backButton', {
                    defaultMessage: 'Back',
                  })}
                </>
              ),
              color: 'primary',
              'aria-current': false,
              href: '#',
              onClick: (e) =>
                application.navigateToUrl(http.basePath.prepend(`${PLUGIN_ROUTE_ROOT}`)),
            },
          ]}
          restrictWidth
          color="primary"
          data-test-subj="queryRulesetDetailHeader"
          rightSideItems={[
            <EuiFlexGroup alignItems="center" key="queryRulesetDetailHeaderButtons">
              <EuiFlexItem grow={false}>
                <EuiButton
                  iconType="save"
                  fill
                  color="primary"
                  data-test-subj="queryRulesetDetailHeaderSaveButton"
                  onClick={() => {
                    // Logic to save the query ruleset
                  }}
                >
                  <FormattedMessage
                    id="xpack.queryRules.queryRulesetDetail.saveButton"
                    defaultMessage="Save"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>,
          ]}
        />
      )}
      {!isError && <QueryRuleDetailPanel rulesetId={rulesetId} />}
      {isError && (
        <ErrorPrompt
          errorType={
            isPermissionError(error)
              ? 'missingPermissions'
              : isNotFoundError(error)
              ? 'notFound'
              : 'generic'
          }
          data-test-subj="queryRulesetDetailErrorPrompt"
        />
      )}
    </QueryRulesPageTemplate>
  );
};
