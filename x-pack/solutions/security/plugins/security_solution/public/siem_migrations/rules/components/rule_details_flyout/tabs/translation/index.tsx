/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
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
import type { RuleMigration } from '../../../../../../../common/siem_migrations/model/rule_migration.gen';
import { TranslationTabHeader } from './header';
import * as i18n from './translations';
import {
  convertTranslationResultIntoColor,
  convertTranslationResultIntoText,
} from '../../../../utils/translation_results';
import { TranslationCallOut } from './callout';
import { OriginalRuleQuery, TranslatedRuleQuery } from './query_details';

interface TranslationTabProps {
  ruleMigration: RuleMigration;
  matchedPrebuiltRule?: RuleResponse;
  onTranslationUpdate?: (ruleName: string, ruleQuery: string) => Promise<void>;
}

export const TranslationTab: React.FC<TranslationTabProps> = React.memo(
  ({ ruleMigration, matchedPrebuiltRule, onTranslationUpdate }) => {
    const { euiTheme } = useEuiTheme();

    const isInstalled = !!ruleMigration.elastic_rule?.id;

    return (
      <>
        <EuiSpacer size="m" />
        {ruleMigration.translation_result && !isInstalled && (
          <>
            <TranslationCallOut ruleMigration={ruleMigration} />
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
                      onClickAriaLabel={'Translation status badge'}
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
                  <EuiFlexItem grow={1}>
                    <OriginalRuleQuery ruleMigration={ruleMigration} />
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
                      ruleMigration={ruleMigration}
                      matchedPrebuiltRule={matchedPrebuiltRule}
                      onTranslationUpdate={onTranslationUpdate}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiSplitPanel.Inner>
            </EuiSplitPanel.Outer>
          </EuiFlexItem>
        </EuiAccordion>
        {ruleMigration.translation_result === RuleTranslationResult.FULL && (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut
              color={'primary'}
              title={i18n.CALLOUT_TRANSLATED_RULE_INFO_TITLE}
              iconType={'iInCircle'}
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
