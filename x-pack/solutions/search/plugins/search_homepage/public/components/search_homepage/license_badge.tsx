/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiBadge, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { LicenseType } from '@kbn/licensing-types/src/types';
import { css } from '@emotion/react';
import { useGetLicenseInfo } from '../../hooks/use_get_license_info';

export const LicenseBadge = () => {
  const { isTrial, licenseType } = useGetLicenseInfo();
  const { euiTheme } = useEuiTheme();

  const LICENSE_LABEL: Record<LicenseType, string> = {
    trial: i18n.translate('xpack.searchHomepage.licenseLabel.trial', {
      defaultMessage: 'TRIAL',
    }),
    basic: i18n.translate('xpack.searchHomepage.licenseLabel.basic', {
      defaultMessage: 'BASIC',
    }),
    standard: i18n.translate('xpack.searchHomepage.licenseLabel.standard', {
      defaultMessage: 'STANDARD',
    }),
    gold: i18n.translate('xpack.searchHomepage.licenseLabel.gold', {
      defaultMessage: 'GOLD',
    }),
    platinum: i18n.translate('xpack.searchHomepage.licenseLabel.platinum', {
      defaultMessage: 'PLATINUM',
    }),
    enterprise: i18n.translate('xpack.searchHomepage.licenseLabel.enterprise', {
      defaultMessage: 'ENTERPRISE',
    }),
  };
  return (
    licenseType && (
      <EuiBadge
        css={css({
          borderRadius: euiTheme.size.l,
          padding: `0 ${euiTheme.size.m}`,
        })}
        color={isTrial ? 'primary' : 'hollow'}
      >
        {LICENSE_LABEL[licenseType]}
      </EuiBadge>
    )
  );
};
