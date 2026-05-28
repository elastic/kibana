/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PropsWithChildren } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiPanel, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { RuleHistoryItem } from '../../../../../common/api/detection_engine/rule_management';
import * as i18n from './translations';

export interface RuleActionItemWrapperProps {
  item: RuleHistoryItem;
  onOpenDetails?: (item: RuleHistoryItem) => void;
}

export function RuleActionItemWrapper({
  item,
  children,
  onOpenDetails,
}: PropsWithChildren<RuleActionItemWrapperProps>): JSX.Element {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel
      hasBorder={false}
      paddingSize="s"
      css={css`
        background-color: ${euiTheme.colors.backgroundBaseSubdued};
      `}
    >
      <EuiFlexGroup
        justifyContent="flexStart"
        alignItems="center"
        gutterSize="s"
        responsive={false}
        direction="row"
      >
        <EuiFlexItem>{children}</EuiFlexItem>
        {onOpenDetails && (
          <EuiFlexItem grow={false}>
            <EuiLink
              onClick={() => onOpenDetails(item)}
              data-test-subj={`ruleChangeHistoryViewDetails-${item.id}`}
            >
              <i18n.VIEW_DETAILS_LINK />
            </EuiLink>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
}
