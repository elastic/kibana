/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AccountType } from '@kbn/fleet-plugin/common/types';

interface AccountBadgeProps {
  accountType?: AccountType;
  variant?: 'default' | 'flyout';
}

export const AccountBadge: React.FC<AccountBadgeProps> = ({ accountType, variant = 'default' }) => {
  if (!accountType) {
    return null;
  }

  const color = variant === 'flyout' ? 'default' : 'hollow';

  const label =
    accountType === 'single'
      ? i18n.translate(
          'securitySolutionPackages.cloudSecurityPosture.accountBadge.singleAccountLabel',
          {
            defaultMessage: 'Single Account',
          }
        )
      : i18n.translate(
          'securitySolutionPackages.cloudSecurityPosture.accountBadge.organizationLabel',
          {
            defaultMessage: 'Organization',
          }
        );

  return <EuiBadge color={color}>{label}</EuiBadge>;
};
