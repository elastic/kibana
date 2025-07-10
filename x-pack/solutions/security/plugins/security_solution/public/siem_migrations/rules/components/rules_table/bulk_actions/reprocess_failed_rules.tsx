/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React from 'react';
import * as i18n from './translations';
import { WithMissingPrivilegesTooltip } from '../../missing_privileges';

interface ReprocessFailedRulesButtonProps {
  onClick?: () => void;
  isLoading?: boolean;
  numberOfFailedRules: number;
  isDisabled?: boolean;
  isAuthorized: boolean;
}

const ReprocessFailedRulesButtonComp = React.memo(function ReprocessFailedRulesButton({
  onClick,
  isLoading = false,
  numberOfFailedRules = 0,
  isDisabled = false,
  isAuthorized,
}: ReprocessFailedRulesButtonProps) {
  return (
    <EuiButton
      iconType="refresh"
      color={'warning'}
      onClick={onClick}
      disabled={isDisabled || !isAuthorized}
      isLoading={isLoading}
      data-test-subj="reprocessFailedRulesButton"
      aria-label={i18n.REPROCESS_FAILED_ARIA_LABEL}
    >
      {i18n.REPROCESS_FAILED_RULES(numberOfFailedRules)}
    </EuiButton>
  );
});

export const ReprocessFailedRulesButton = WithMissingPrivilegesTooltip(
  ReprocessFailedRulesButtonComp,
  'all'
);
