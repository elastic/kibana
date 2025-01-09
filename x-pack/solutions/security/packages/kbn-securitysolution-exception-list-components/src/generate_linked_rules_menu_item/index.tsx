/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ElementType, ReactElement } from 'react';
import { css } from '@emotion/css';
import {
  EuiContextMenuItem,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  IconType,
  useEuiTheme,
} from '@elastic/eui';
import { Rule } from '../types';

interface MenuItemLinkedRulesProps {
  leftIcon?: IconType;
  dataTestSubj?: string;
  linkedRules: Rule[];
  securityLinkAnchorComponent: ElementType; // This property needs to be removed to avoid the Prop Drilling, once we move all the common components from x-pack/security-solution/common
}

export const LinkedRulesMenuItems = ({
  dataTestSubj,
  linkedRules,
  securityLinkAnchorComponent,
  leftIcon = '',
}: MenuItemLinkedRulesProps): ReactElement[] | null => {
  const { euiTheme } = useEuiTheme();
  const containerCss = css`
    border-bottom: ${euiTheme.border.thin};
  `;

  const itemContentCss = css`
    color: ${euiTheme.colors.textPrimary};
    flex-basis: content;
  `;

  if (!linkedRules.length || securityLinkAnchorComponent === null) return null;

  const SecurityLinkAnchor = securityLinkAnchorComponent;
  return linkedRules.map((rule) => {
    return (
      <EuiContextMenuItem
        css={linkedRules.length > 1 ? containerCss : ''}
        data-test-subj={`${dataTestSubj || ''}ActionItem${rule.id}`}
        key={rule.id}
      >
        <EuiFlexGroup gutterSize="s" css={itemContentCss}>
          {leftIcon ? (
            <EuiFlexItem data-test-subj={`${dataTestSubj || ''}LeftIcon`} grow={false}>
              <EuiIcon type={leftIcon} />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem css={itemContentCss}>
            <SecurityLinkAnchor external referenceName={rule.name} referenceId={rule.id} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiContextMenuItem>
    );
  });
};
