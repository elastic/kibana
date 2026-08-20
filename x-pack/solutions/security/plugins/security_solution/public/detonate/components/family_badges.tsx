/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';

import { NO_FAMILY, NO_FAMILY_TOOLTIP } from '../translations';

interface FamilyBadgesProps {
  families: string[];
  /**
   * Threat classes such as `Trojan` or `Infostealer`, shown alongside the family because they are
   * what tells an infostealer apart from commodity ransomware at a glance.
   */
  categories: string[];
}

const FamilyBadgesComponent: React.FC<FamilyBadgesProps> = ({ families, categories }) => {
  if (families.length === 0) {
    return (
      <EuiToolTip content={NO_FAMILY_TOOLTIP}>
        <EuiText size="s" color="subdued" tabIndex={0}>
          {NO_FAMILY}
        </EuiText>
      </EuiToolTip>
    );
  }

  return (
    <EuiFlexGroup gutterSize="xs" wrap responsive={false} alignItems="center">
      {families.map((family) => (
        <EuiFlexItem grow={false} key={family}>
          <EuiBadge color="hollow">{family}</EuiBadge>
        </EuiFlexItem>
      ))}
      {categories.map((category) => (
        <EuiFlexItem grow={false} key={category}>
          <EuiText size="xs" color="subdued">
            {category}
          </EuiText>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

export const FamilyBadges = React.memo(FamilyBadgesComponent);
