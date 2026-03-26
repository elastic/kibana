/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import * as i18n from './translations';
import type { RuleMigrationRule } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { WithMissingPrivilegesTooltip } from '../../../common/components';

interface InstallActionButtonProps {
  isAuthorized: boolean;
  isDisabled?: boolean;
  migrationRule: RuleMigrationRule;
  installMigrationRule: (migrationRule: RuleMigrationRule, enable?: boolean) => void;
}

const InstallActionBtnComp = ({
  isDisabled = false,
  isAuthorized,
  migrationRule,
  installMigrationRule,
}: InstallActionButtonProps) => {
  return (
    <EuiLink
      disabled={isDisabled || !isAuthorized}
      onClick={() => {
        installMigrationRule(migrationRule);
      }}
      data-test-subj="installRule"
    >
      {i18n.ACTIONS_INSTALL_LABEL}
    </EuiLink>
  );
};

export const InstallRuleActionBtn = WithMissingPrivilegesTooltip(
  InstallActionBtnComp,
  'rule',
  'all'
);
