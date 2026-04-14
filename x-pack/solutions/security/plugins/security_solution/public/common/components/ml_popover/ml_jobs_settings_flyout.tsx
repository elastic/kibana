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
} from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { MlJobsAdminFields } from './ml_jobs_admin_fields';
import { UpgradeContents } from './upgrade_contents';
import * as i18n from './translations';
import type { MlJobsSettingsData } from './hooks/use_ml_jobs_settings_data';

const FlyoutBodyContents = styled.div`
  max-width: 684px;
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  overflow-x: hidden;
  padding-bottom: 15px;
`;

FlyoutBodyContents.displayName = 'FlyoutBodyContents';

export interface MlJobsSettingsFlyoutProps {
  isOpen: boolean;
  onClose: () => void;
  data: Extract<MlJobsSettingsData, { variant: 'upgrade' } | { variant: 'admin' }>;
}

export const MlJobsSettingsFlyout = React.memo(
  ({ isOpen, onClose, data }: MlJobsSettingsFlyoutProps) => {
    if (!isOpen) {
      return null;
    }

    return (
      <EuiFlyout
        aria-labelledby="securityMlJobsSettingsFlyoutTitle"
        hideCloseButton={false}
        onClose={onClose}
        ownFocus
        size="m"
        type="overlay"
        data-test-subj="ml-jobs-settings-flyout"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id="securityMlJobsSettingsFlyoutTitle">{i18n.ML_JOB_SETTINGS}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          {data.variant === 'upgrade' ? (
            <UpgradeContents />
          ) : (
            <FlyoutBodyContents data-test-subj="ml-flyout-contents">
              <MlJobsAdminFields admin={data.admin} />
            </FlyoutBodyContents>
          )}
        </EuiFlyoutBody>
      </EuiFlyout>
    );
  }
);

MlJobsSettingsFlyout.displayName = 'MlJobsSettingsFlyout';
