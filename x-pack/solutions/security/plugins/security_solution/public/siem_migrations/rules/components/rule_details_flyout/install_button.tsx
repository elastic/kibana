/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { WithMissingPrivilegesTooltip } from '../../../common/components/missing_privileges';

interface InstallMigrationRuleButtonProps {
  isAuthorized: boolean;
  isDisabled: boolean;
  onClick: () => void;
  fill?: boolean;
  'data-test-subj': string;
  children: React.ReactNode;
}

const InstallMigrationRuleButtonComponent: React.FC<InstallMigrationRuleButtonProps> = ({
  isAuthorized,
  isDisabled,
  ...buttonProps
}) => <EuiButton {...buttonProps} disabled={isDisabled || !isAuthorized} />;

export const InstallMigrationRuleButton = WithMissingPrivilegesTooltip(
  InstallMigrationRuleButtonComponent,
  'rule',
  'all'
);
