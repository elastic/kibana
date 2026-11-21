/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiText } from '@elastic/eui';
import { getProtectionNoticeSupportedEndpointVersion } from './protection_notice_supported_endpoint_version';
import type { UIPolicyConfig } from '../../../../../../common/endpoint/types';

export const SupportedVersionForProtectionNotice = React.memo(
  ({
    protection,
    os,
    'data-test-subj': dataTestSubj,
  }: {
    protection: string;
    /** Set when the notice describes a single OS row rather than the whole protection. */
    os?: keyof UIPolicyConfig;
    'data-test-subj'?: string;
  }) => {
    const version = useMemo(
      () => getProtectionNoticeSupportedEndpointVersion(protection, os),
      [protection, os]
    );

    if (!version) {
      return null;
    }

    return (
      <EuiText color="subdued" size="xs" data-test-subj={dataTestSubj}>
        <i>
          <FormattedMessage
            id="xpack.securitySolution.endpoint.policyDetails.supportedVersion"
            defaultMessage="Agent version {version}"
            values={{ version }}
          />
        </i>
      </EuiText>
    );
  }
);
SupportedVersionForProtectionNotice.displayName = 'SupportedVersionForProtectionNotice';
