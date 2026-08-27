/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';

import type { ProtectionEventCode } from '../../../common/detonate';
import { PROTECTION_COLORS, PROTECTION_LABELS } from '../labels';

interface ProtectionsBadgesProps {
  protections: ProtectionEventCode[];
}

const ProtectionsBadgesComponent: React.FC<ProtectionsBadgesProps> = ({ protections }) => {
  if (protections.length === 0) {
    return (
      <EuiText size="s" color="subdued">
        {'—'}
      </EuiText>
    );
  }

  return (
    <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
      {protections.map((protection) => (
        <EuiFlexItem grow={false} key={protection}>
          <EuiBadge color={PROTECTION_COLORS[protection]}>{PROTECTION_LABELS[protection]}</EuiBadge>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

export const ProtectionsBadges = React.memo(ProtectionsBadgesComponent);
