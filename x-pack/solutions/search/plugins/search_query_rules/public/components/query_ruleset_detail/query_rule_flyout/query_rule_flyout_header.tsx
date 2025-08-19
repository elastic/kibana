/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlyoutHeader, EuiFlexGroup, EuiFlexItem, EuiTitle, EuiIconTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

const getHeaderText = (createMode: boolean) =>
  createMode ? (
    <FormattedMessage
      id="xpack.search.queryRulesetDetail.queryRuleFlyoutTitle.create"
      defaultMessage="Create rule"
    />
  ) : (
    <FormattedMessage
      id="xpack.search.queryRulesetDetail.queryRuleFlyoutTitle.edit"
      defaultMessage="Edit rule"
    />
  );

interface QueryRuleFlyoutHeaderProps {
  createMode: boolean;
  ruleId: string;
}

export const QueryRuleFlyoutHeader: React.FC<QueryRuleFlyoutHeaderProps> = ({
  createMode,
  ruleId,
}) => {
  return (
    <EuiFlyoutHeader hasBorder data-test-subj="queryRulesFlyoutHeader">
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiTitle size="m" id="flyoutTitle">
            <h2>{getHeaderText(createMode)}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <FormattedMessage
                defaultMessage="Rule ID: {ruleId}"
                id="xpack.search.queryRulesetDetail.queryRuleFlyout.ruleId"
                values={{ ruleId }}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiIconTip
                content={
                  <FormattedMessage
                    defaultMessage="The unique identifier of the query rule within the specified ruleset to retrieve"
                    id="xpack.search.queryRulesetDetail.queryRuleFlyout.ruleIdTooltip"
                  />
                }
                position="right"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutHeader>
  );
};
