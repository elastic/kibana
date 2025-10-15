/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { usePlaygroundLicenseStatus } from '../hooks/use_license_status';
import { useKibana } from '../hooks/use_kibana';

export const PlaygroundLicensingCTA = () => {
  const { application, licenseManagement } = useKibana().services;
  const { hasExpiredLicense } = usePlaygroundLicenseStatus();

  if (licenseManagement === undefined || licenseManagement.enabled === false) {
    return (
      <EuiTitle>
        <h2>
          {i18n.translate('xpack.searchPlayground.unavailable.upgradeTitle', {
            defaultMessage: 'Upgrade your license to use the Playground.',
          })}
        </h2>
      </EuiTitle>
    );
  }

  if (hasExpiredLicense) {
    return (
      <EuiFlexGroup justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={i18n.translate(
              'xpack.searchPlayground.unavailable.startTrial.expiredTooltip',
              {
                defaultMessage:
                  'Your license has expired. Manage your license to continue using Enterprise features.',
              }
            )}
          >
            <EuiButton data-test-subj="playgroundsStartTrialButton" fill disabled fullWidth={false}>
              {i18n.translate('xpack.searchPlayground.unavailable.startTrial.button', {
                defaultMessage: 'Start trial',
              })}
            </EuiButton>
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="playgroundsManageLicenseButton"
            aria-label={i18n.translate(
              'xpack.searchPlayground.unavailable.manageLicense.aria-label',
              {
                defaultMessage: 'Open license management to update your license.',
              }
            )}
            onClick={() =>
              application.navigateToApp('management', {
                path: 'stack/license_management/home',
              })
            }
          >
            {i18n.translate('xpack.searchPlayground.unavailable.manageLicense.button', {
              defaultMessage: 'Manage license',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <span>
      <EuiButton
        aria-label={i18n.translate('xpack.searchPlayground.unavailable.manageLicense.aria-label', {
          defaultMessage: 'Open license management to start a free trial.',
        })}
        data-test-subj="playgroundsStartTrialButton"
        fill
        fullWidth={false}
        onClick={() =>
          application.navigateToApp('management', {
            path: 'stack/license_management/home',
          })
        }
      >
        {i18n.translate('xpack.searchPlayground.unavailable.startTrial.button', {
          defaultMessage: 'Start trial',
        })}
      </EuiButton>
    </span>
  );
};
