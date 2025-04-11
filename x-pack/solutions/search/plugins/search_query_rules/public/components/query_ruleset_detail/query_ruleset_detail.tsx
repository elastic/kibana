/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';

import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useParams } from 'react-router-dom';
import { QueryRulesQueryRule } from '@elastic/elasticsearch/lib/api/types';
import { useKibana } from '../../hooks/use_kibana';
import { QueryRuleDraggableList } from './query_rule_draggable_list';
import { useFetchQueryRuleset } from '../../hooks/use_fetch_query_ruleset';
import { ErrorPrompt } from '../error_prompt/error_prompt';
import { isNotFoundError, isPermissionError } from '../../utils/query_rules_utils';

export const QueryRulesetDetail: React.FC = () => {
  const { rulesetId = '' } = useParams<{
    rulesetId?: string;
  }>();

  const {
    data: queryRulesetData,
    isInitialLoading,
    isError,
    error,
  } = useFetchQueryRuleset(rulesetId);

  const {
    services: { console: consolePlugin, history, searchNavigation },
  } = useKibana();

  const embeddableConsole = useMemo(
    () => (consolePlugin?.EmbeddableConsole ? <consolePlugin.EmbeddableConsole /> : null),
    [consolePlugin]
  );
  const [rules, setRules] = useState<QueryRulesQueryRule[]>(queryRulesetData?.rules ?? []);

  useEffect(() => {
    if (queryRulesetData?.rules) {
      setRules(queryRulesetData.rules);
    }
  }, [queryRulesetData?.rules]);

  return (
    <KibanaPageTemplate
      offset={0}
      restrictWidth
      grow={false}
      data-test-subj="queryRulesetDetailPage"
      solutionNav={searchNavigation?.useClassicNavigation(history)}
      color="primary"
    >
      {!isInitialLoading && !isError && !!queryRulesetData && (
        <KibanaPageTemplate.Header
          pageTitle={rulesetId}
          restrictWidth
          color="primary"
          data-test-subj="queryRulesetDetailHeader"
          rightSideItems={[
            <EuiFlexGroup alignItems="center" key="queryRulesetDetailHeaderButtons">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType="database"
                  color="primary"
                  data-test-subj="queryRulesetDetailHeaderDataButton"
                  onClick={() => {
                    // Logic to handle data button click
                  }}
                >
                  <FormattedMessage
                    id="xpack.queryRules.queryRulesetDetail.dataButton"
                    defaultMessage="Data"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
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
      {!isError && (
        <KibanaPageTemplate.Section restrictWidth>
          <EuiFlexGroup justifyContent="spaceBetween" direction="column">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup alignItems="center">
                    <EuiFlexItem>
                      <EuiButton
                        iconType="plusInCircle"
                        color="primary"
                        data-test-subj="queryRulesetDetailAddRuleButton"
                        onClick={() => {
                          // Logic to add a new rule
                        }}
                      >
                        <FormattedMessage
                          id="xpack.queryRules.queryRulesetDetail.addRuleButton"
                          defaultMessage="Add rule"
                        />
                      </EuiButton>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiText>
                        {rules.length > 1 ? (
                          <FormattedMessage
                            id="xpack.queryRules.queryRulesetDetail.ruleCountPlural"
                            defaultMessage="{ruleCount} rules"
                            values={{ ruleCount: rules.length }}
                            data-test-subj="queryRulesetDetailRuleCount"
                          />
                        ) : (
                          <FormattedMessage
                            id="xpack.queryRules.queryRulesetDetail.ruleCountSingular"
                            defaultMessage="{ruleCount} rule"
                            values={{ ruleCount: rules.length }}
                            data-test-subj="queryRulesetDetailRuleCount"
                          />
                        )}
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <QueryRuleDraggableList rules={rules} onReorder={setRules} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </KibanaPageTemplate.Section>
      )}
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
      {embeddableConsole}
    </KibanaPageTemplate>
  );
};
