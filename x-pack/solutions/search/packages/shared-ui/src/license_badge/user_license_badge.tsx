/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiBadge, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { LicenseType } from '@kbn/licensing-types';
import { css } from '@emotion/react';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { useGetLicenseInfo } from '../hooks';

interface Props {
  licensing: LicensingPluginStart;
}
const LICENSE_LABEL: Record<LicenseType, string> = {
  trial: i18n.translate('xpack.searchSharedUI.licenseLabel.trial', {
    defaultMessage: 'TRIAL',
  }),
  basic: i18n.translate('xpack.searchSharedUI.licenseLabel.basic', {
    defaultMessage: 'BASIC',
  }),
  standard: i18n.translate('xpack.searchSharedUI.licenseLabel.standard', {
    defaultMessage: 'STANDARD',
  }),
  gold: i18n.translate('xpack.searchSharedUI.licenseLabel.gold', {
    defaultMessage: 'GOLD',
  }),
  platinum: i18n.translate('xpack.searchSharedUI.licenseLabel.platinum', {
    defaultMessage: 'PLATINUM',
  }),
  enterprise: i18n.translate('xpack.searchSharedUI.licenseLabel.enterprise', {
    defaultMessage: 'ENTERPRISE',
  }),
};
export const LicenseBadge: React.FC<Props> = ({ licensing }: Props) => {
  const { isTrial, licenseType } = useGetLicenseInfo(licensing);
  const { euiTheme } = useEuiTheme();

  return (
    licenseType && (
      <EuiBadge
        css={css({
          borderRadius: euiTheme.size.l,
          padding: `0 ${euiTheme.size.m}`,
        })}
        color={isTrial ? 'primary' : 'hollow'}
        aria-label={LICENSE_LABEL[licenseType]}
      >
        {LICENSE_LABEL[licenseType]}
      </EuiBadge>
    )
  );
};
