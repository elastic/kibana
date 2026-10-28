/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { RULE_DETAILS_NOT_FOUND_TEST_ID } from './test_ids';

/**
 * Shown when the rule was deleted and none of its alerts are left to rebuild it from.
 */
export const RuleNotFound: React.FC = () => (
  <EuiFlexItem>
    <EuiEmptyPrompt
      iconType="warning"
      color="warning"
      title={
        <h2>
          <FormattedMessage
            id="xpack.securitySolution.flyout.rule.notFoundTitle"
            defaultMessage="Rule not found"
          />
        </h2>
      }
      body={
        <p>
          <FormattedMessage
            id="xpack.securitySolution.flyout.rule.notFoundDescription"
            defaultMessage="This rule has been deleted, so its details can no longer be displayed."
          />
        </p>
      }
      data-test-subj={RULE_DETAILS_NOT_FOUND_TEST_ID}
    />
  </EuiFlexItem>
);

RuleNotFound.displayName = 'RuleNotFound';
