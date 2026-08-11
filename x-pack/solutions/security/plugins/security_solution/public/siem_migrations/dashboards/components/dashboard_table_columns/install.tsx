/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import * as i18n from './translations';
import { WithMissingPrivilegesTooltip } from '../../../common/components';

interface InstallDashboardActionProps {
  isAuthorized: boolean;
  isDisabled?: boolean;
  onInstall: () => void;
}

const InstallDashboardAction = ({
  isDisabled = false,
  isAuthorized,
  onInstall,
}: InstallDashboardActionProps) => {
  return (
    <EuiLink
      disabled={isDisabled || !isAuthorized}
      onClick={onInstall}
      data-test-subj="installDashboard"
    >
      {i18n.ACTIONS_INSTALL_LABEL}
    </EuiLink>
  );
};

export const InstallDashboardActionBtn = WithMissingPrivilegesTooltip(
  InstallDashboardAction,
  'dashboard',
  'all'
);
