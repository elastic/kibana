/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  DraggableListHeader,
  DocsColumnContainer,
  ActionHeaderContainer,
  DocumentCountLabelContainer,
} from '../styles';

export const QueryRuleDraggableListHeader: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup css={DraggableListHeader(euiTheme)}>
      <EuiFlexItem grow={7}>
        <EuiText size="xs">
          <b>
            <FormattedMessage
              id="xpack.search.queryRulesetDetail.draggableList.ruleConditionsLabel"
              defaultMessage="Rule Conditions"
            />
          </b>
        </EuiText>
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
