/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { EuiFlyoutFooter, EuiFlyoutHeader, EuiFlyoutBody } from '@elastic/eui';
import { useRuleDetails } from './hooks/use_rule_details';
import { Header } from './header';
import { Content } from './content';
import { Footer } from './footer';
import { FlyoutLoading } from '../shared/components/flyout_loading';
import { FlyoutError } from '../shared/components/flyout_error';
import { RULE_DETAILS_LOADING_TEST_ID } from './test_ids';

export interface RuleDetailsProps {
  /**
   * The unique identifier of the rule to display.
   */
  ruleId?: string;
}

/**
 * Displays the full details of a detection rule inside a flyout,
 * including its header, body content, and footer actions.
 */
export const RuleDetails: FC<RuleDetailsProps> = memo(({ ruleId }) => {
  const { rule, loading, isExistingRule } = useRuleDetails({ ruleId });

  if (loading) {
    return <FlyoutLoading data-test-subj={RULE_DETAILS_LOADING_TEST_ID} />;
  }

  if (!rule) {
    return <FlyoutError />;
  }

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <Header rule={rule} isSuppressed={!isExistingRule} />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <Content rule={rule} />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <Footer rule={rule} />
      </EuiFlyoutFooter>
    </>
  );
});

RuleDetails.displayName = 'RuleDetails';
