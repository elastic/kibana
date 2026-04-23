/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { EuiFlyoutHeader, EuiFlyoutBody, EuiLoadingSpinner, EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useRuleDetails } from './hooks/use_rule_details';
import { Header } from './header';
import { Content } from './content';
import { Footer } from './footer';
import { RULE_DETAILS_LOADING_TEST_ID, RULE_DETAILS_ERROR_TEST_ID } from './test_ids';

export interface RuleDetailsProps {
  ruleId: string;
}

export const RuleDetails: FC<RuleDetailsProps> = memo(({ ruleId }) => {
  const { rule, loading, isExistingRule } = useRuleDetails({ ruleId });

  if (loading) {
    return (
      <EuiFlyoutBody>
        <EuiEmptyPrompt
          icon={<EuiLoadingSpinner size="xl" />}
          data-test-subj={RULE_DETAILS_LOADING_TEST_ID}
        />
      </EuiFlyoutBody>
    );
  }

  if (!rule) {
    return (
      <EuiFlyoutBody>
        <EuiEmptyPrompt
          iconType="warning"
          title={
            <h2>
              {i18n.translate('xpack.securitySolution.flyout.ruleDetails.errorTitle', {
                defaultMessage: 'Unable to display rule details',
              })}
            </h2>
          }
          body={
            <p>
              {i18n.translate('xpack.securitySolution.flyout.ruleDetails.errorBody', {
                defaultMessage:
                  'There was an error displaying the rule details. Please try again later.',
              })}
            </p>
          }
          data-test-subj={RULE_DETAILS_ERROR_TEST_ID}
        />
      </EuiFlyoutBody>
    );
  }

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <Header rule={rule} isSuppressed={!isExistingRule} />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <Content rule={rule} />
      </EuiFlyoutBody>
      <Footer rule={rule} />
    </>
  );
});

RuleDetails.displayName = 'RuleDetails';
