/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiText, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  DraggableListHeader,
  DocsColumnContainer,
  ActionHeaderContainer,
  DocumentCountLabelContainer,
} from '../styles';

interface QueryRuleDraggableListHeaderProps {
  tourInfo?: {
    title: string;
    content: string;
  };
}

export const QueryRuleDraggableListHeader: React.FC<QueryRuleDraggableListHeaderProps> = ({
  tourInfo,
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup css={DraggableListHeader(euiTheme)} responsive={false}>
      <EuiFlexItem grow={7}>
        <EuiFlexGroup direction="row" alignItems="center" gutterSize="l" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
              <EuiText size="xs">
                <b>
                  <FormattedMessage
                    id="xpack.search.queryRulesetDetail.draggableList.ruleConditionsLabel"
                    defaultMessage="Order"
                  />
                </b>
              </EuiText>
              <EuiIconTip title={tourInfo?.title} content={tourInfo?.content} position="right" />
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs">
              <b>
                <FormattedMessage
                  id="xpack.search.queryRulesetDetail.draggableList.ruleConditionsLabel"
                  defaultMessage="Rule Conditions"
                />
              </b>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          alignItems="center"
          justifyContent="center"
          gutterSize="m"
          responsive={false}
          css={DocsColumnContainer(euiTheme)}
        >
          <EuiFlexItem grow={false} css={ActionHeaderContainer(euiTheme)}>
            <EuiText size="xs">
              <b>
                <FormattedMessage
                  id="xpack.search.queryRulesetDetail.draggableList.actionLabel"
                  defaultMessage="Action"
                />
              </b>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false} css={DocumentCountLabelContainer(euiTheme)}>
            <EuiText size="xs">
              <b>
                <FormattedMessage
                  id="xpack.search.queryRulesetDetail.draggableList.documentCountLabel"
                  defaultMessage="Documents"
                />
              </b>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
