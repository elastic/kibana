/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React from 'react';
import * as i18n from './translations';
import { UpgradeContents } from './upgrade_contents';
import { useSecurityJobs } from './hooks/use_security_jobs';
import { MlJobSettingsContent } from './ml_job_settings_content';

export const ML_SETTINGS_FLYOUT_TEST_ID = 'ml-settings-flyout';

export interface MlSettingsFlyoutProps {
  onClose: () => void;
}

/**
 * ML job settings, ported from the legacy `MlPopover` dropdown into a flyout since its jobs
 * table doesn't fit the app header's menu item schema.
 */
export const MlSettingsFlyout = React.memo(({ onClose }: MlSettingsFlyoutProps) => {
  const flyoutTitleId = useGeneratedHtmlId();
  const { isLicensed } = useSecurityJobs();

  return (
    <EuiFlyout
      aria-labelledby={flyoutTitleId}
      data-test-subj={ML_SETTINGS_FLYOUT_TEST_ID}
      onClose={onClose}
      size="m"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={flyoutTitleId}>{i18n.ML_JOB_SETTINGS}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{!isLicensed ? <UpgradeContents /> : <MlJobSettingsContent />}</EuiFlyoutBody>
    </EuiFlyout>
  );
});

MlSettingsFlyout.displayName = 'MlSettingsFlyout';
