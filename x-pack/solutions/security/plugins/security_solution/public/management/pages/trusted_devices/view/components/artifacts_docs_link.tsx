/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../../../../common/lib/kibana';

/**
 * Link to Trusted Devices documentation
 *
 * NOTE: This is currently a placeholder for UI development.
 * Actual documentation links will be implemented in future phase.
 */
export const TrustedDevicesArtifactsDocsLink = memo(() => {
  const { docLinks } = useKibana().services;

  return (
    <EuiLink href={docLinks.links.securitySolution.trustedDevices} target="_blank">
      <FormattedMessage
        id="xpack.securitySolution.trustedDevices.form.addTrustedDeviceDocsLink"
        defaultMessage="Learn more about adding trusted devices"
      />
    </EuiLink>
  );
});

TrustedDevicesArtifactsDocsLink.displayName = 'TrustedDevicesArtifactsDocsLink';
