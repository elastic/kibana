/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSplitPanel,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { FormattedMessage } from '@kbn/i18n-react';
import type { RuleResponse } from '../../../../../../../common/api/detection_engine';
import type { RuleMigration } from '../../../../../../../common/siem_migrations/model/rule_migration.gen';
import { TranslationTabHeader } from './header';
import { MigrationRuleQuery } from './migration_rule_query';
import * as i18n from './translations';
import {
  convertTranslationResultIntoColor,
  convertTranslationResultIntoText,
} from '../../../../utils/translation_results';
import { TranslationCallOut } from './callout';

interface TranslationTabProps {
  ruleMigration: RuleMigration;
  matchedPrebuiltRule?: RuleResponse;
  onTranslationUpdate?: (ruleName: string, ruleQuery: string) => Promise<void>;
}

export const TranslationTab: React.FC<TranslationTabProps> = React.memo(
  ({ ruleMigration, matchedPrebuiltRule, onTranslationUpdate }) => {
    const { euiTheme } = useEuiTheme();

    const isInstalled = !!ruleMigration.elastic_rule?.id;
    const canEdit = !matchedPrebuiltRule && !isInstalled;

    const originalRuleQueryComponent = useMemo(() => {
      return (
        <MigrationRuleQuery
          title={i18n.SPLUNK_QUERY_TITLE}
          ruleName={ruleMigration.original_rule.title}
          query={ruleMigration.original_rule.query}
          queryLanguage={ruleMigration.original_rule.query_language}
          canEdit={false}
        />
      );
    }, [ruleMigration]);

    const translatedRuleQueryComponent = useMemo(() => {
      let translatedQuery = ruleMigration.elastic_rule?.query ?? '';
      let translatedQueryLanguage = ruleMigration.elastic_rule?.query_language ?? '';
      if (matchedPrebuiltRule && matchedPrebuiltRule.type !== 'machine_learning') {
        translatedQuery = matchedPrebuiltRule.query ?? '';
        translatedQueryLanguage = matchedPrebuiltRule.language;
      }
      return (
        <MigrationRuleQuery
          title={i18n.ESQL_TRANSLATION_TITLE}
          ruleName={matchedPrebuiltRule?.name ?? ruleMigration.elastic_rule?.title}
          query={translatedQuery}
          queryLanguage={translatedQueryLanguage}
          canEdit={canEdit}
          onTranslationUpdate={onTranslationUpdate}
        />
      );
    }, [canEdit, matchedPrebuiltRule, onTranslationUpdate, ruleMigration]);

    return (
      <>
        <EuiSpacer size="m" />
        {ruleMigration.translation_result && !isInstalled && (
          <>
            <TranslationCallOut translationResult={ruleMigration.translation_result} />
            <EuiSpacer size="m" />
          </>
        )}
        <EuiAccordion
          id="translationQueryItem"
          buttonContent={<TranslationTabHeader />}
          initialIsOpen={true}
        >
          <EuiFlexItem>
            <EuiSpacer size="s" />
            <EuiSplitPanel.Outer grow hasShadow={false} hasBorder={true}>
              <EuiSplitPanel.Inner grow={false} color="subdued" paddingSize="s">
                <EuiFlexGroup justifyContent="flexEnd">
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="xxs">
                      <h2>
                        <FormattedMessage
                          id="xpack.securitySolution.detectionEngine.translationDetails.translationTab.statusTitle"
                          defaultMessage="Translation status"
                        />
                      </h2>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadge
                      color={convertTranslationResultIntoColor(ruleMigration.translation_result)}
                      onClick={() => {}}
                      onClickAriaLabel={'Click to update translation status'}
                    >
                      {isInstalled
                        ? i18n.INSTALLED_LABEL
                        : convertTranslationResultIntoText(ruleMigration.translation_result)}
                    </EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiSplitPanel.Inner>
              <EuiSplitPanel.Inner grow>
                <EuiFlexGroup gutterSize="s" alignItems="flexStart">
                  <EuiFlexItem grow={1}>{originalRuleQueryComponent}</EuiFlexItem>
                  <EuiFlexItem
                    grow={0}
                    css={css`
                      align-self: stretch;
                      border-right: ${euiTheme.border.thin};
                    `}
                  />
                  <EuiFlexItem grow={1}>{translatedRuleQueryComponent}</EuiFlexItem>
                </EuiFlexGroup>
              </EuiSplitPanel.Inner>
            </EuiSplitPanel.Outer>
          </EuiFlexItem>
        </EuiAccordion>
      </>
    );
  }
);
TranslationTab.displayName = 'TranslationTab';
