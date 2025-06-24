/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ElementType, ReactElement } from 'react';
import styled from '@emotion/styled';
import { EuiContextMenuItem, EuiFlexGroup, EuiFlexItem, EuiIcon, IconType } from '@elastic/eui';
import { Rule } from '../types';

interface MenuItemLinkedRulesProps {
  leftIcon?: IconType;
  dataTestSubj?: string;
  linkedRules: Rule[];
  securityLinkAnchorComponent: ElementType; // This property needs to be removed to avoid the Prop Drilling, once we move all the common components from x-pack/security-solution/common
}

export const generateLinkedRulesMenuItems = ({
  dataTestSubj,
  linkedRules,
  securityLinkAnchorComponent,
  leftIcon = '',
}: MenuItemLinkedRulesProps): ReactElement[] | null => {
  if (!linkedRules.length || securityLinkAnchorComponent === null) return null;

  const SecurityLinkAnchor = securityLinkAnchorComponent;
  return linkedRules.map((rule) => {
    return (
      <LinkedRulesMenuItem
        data-test-subj={`${dataTestSubj || ''}ActionItem${rule.id}`}
        key={rule.id}
      >
        <EuiFlexGroup gutterSize="s">
          {leftIcon ? (
            <EuiFlexItem data-test-subj={`${dataTestSubj || ''}LeftIcon`} grow={false}>
              <EuiIcon type={leftIcon} />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem>
            <SecurityLinkAnchor external referenceName={rule.name} referenceId={rule.id} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </LinkedRulesMenuItem>
    );
  });
};

const LinkedRulesMenuItem = styled(EuiContextMenuItem)`
  &:not(:last-child) {
    border-bottom: ${({ theme }) => theme.euiTheme.border.thin};
  }
  color: ${({ theme }) => theme.euiTheme.colors.textPrimary};
`;
