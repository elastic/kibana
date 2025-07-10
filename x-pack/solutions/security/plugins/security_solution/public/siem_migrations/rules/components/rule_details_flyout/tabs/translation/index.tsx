/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSplitPanel,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { FormattedMessage } from '@kbn/i18n-react';
import { RuleTranslationResult } from '../../../../../../../common/siem_migrations/constants';
import type { RuleResponse } from '../../../../../../../common/api/detection_engine';
import type { RuleMigrationRule } from '../../../../../../../common/siem_migrations/model/rule_migration.gen';
import * as i18n from './translations';
import {
  convertTranslationResultIntoColor,
  convertTranslationResultIntoText,
} from '../../../../utils/translation_results';
import { TranslationCallOut } from './callout';
import { OriginalRuleQuery, TranslatedRuleQuery } from './query_details';

interface TranslationTabProps {
  migrationRule: RuleMigrationRule;
  matchedPrebuiltRule?: RuleResponse;
  onTranslationUpdate?: (ruleName: string, ruleQuery: string) => Promise<void>;
}

export const TranslationTab: React.FC<TranslationTabProps> = React.memo(
  ({ migrationRule, matchedPrebuiltRule, onTranslationUpdate }) => {
    const { euiTheme } = useEuiTheme();

    const isInstalled = !!migrationRule.elastic_rule?.id;

    return (
      <>
        <EuiSpacer size="m" />
        {migrationRule.translation_result && !isInstalled && (
          <>
            <TranslationCallOut migrationRule={migrationRule} />
            <EuiSpacer size="m" />
          </>
        )}
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
                    data-test-subj="translationResultBadge"
                    color={convertTranslationResultIntoColor(migrationRule.translation_result)}
                  >
                    {isInstalled
                      ? i18n.INSTALLED_LABEL
                      : convertTranslationResultIntoText(migrationRule.translation_result)}
                  </EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiSplitPanel.Inner>
            <EuiSplitPanel.Inner grow>
              <EuiFlexGroup gutterSize="s" alignItems="flexStart">
                <EuiFlexItem grow={1}>
                  <OriginalRuleQuery migrationRule={migrationRule} />
                </EuiFlexItem>
                <EuiFlexItem
                  grow={0}
                  css={css`
                    align-self: stretch;
                    border-right: ${euiTheme.border.thin};
                  `}
                />
                <EuiFlexItem grow={1}>
                  <TranslatedRuleQuery
                    migrationRule={migrationRule}
                    matchedPrebuiltRule={matchedPrebuiltRule}
                    onTranslationUpdate={onTranslationUpdate}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiSplitPanel.Inner>
          </EuiSplitPanel.Outer>
        </EuiFlexItem>
        {migrationRule.translation_result === RuleTranslationResult.FULL &&
          !migrationRule.elastic_rule?.id && (
            <>
              <EuiSpacer size="m" />
              <EuiCallOut
                color={'primary'}
                title={i18n.CALLOUT_TRANSLATED_RULE_INFO_TITLE}
                iconType={'info'}
                size={'s'}
              >
                {i18n.CALLOUT_TRANSLATED_RULE_INFO_DESCRIPTION}
              </EuiCallOut>
            </>
          )}
      </>
    );
  }
);
TranslationTab.displayName = 'TranslationTab';
