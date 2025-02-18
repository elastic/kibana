/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLink } from '@elastic/eui';
import { useKibana } from '../../../../../common/lib/kibana';

export const TrustedAppsArtifactsDocsLink = memo(() => {
  const {
    docLinks: {
      links: { securitySolution },
    },
  } = useKibana().services;

  return (
    <>
      <FormattedMessage
        id="xpack.securitySolution.trustedApps.docsLinkInfoStart"
        defaultMessage="Have too many alerts? Add an "
      />
      <EuiLink target="_blank" href={`${securitySolution.endpointArtifacts}`}>
        <FormattedMessage
          id="xpack.securitySolution.trustedApps.docsLinkText"
          defaultMessage="endpoint alert exception"
        />
      </EuiLink>
      <FormattedMessage
        id="xpack.securitySolution.trustedApps.docsLinkInfoEnd"
        defaultMessage=" instead."
      />
    </>
  );
});

TrustedAppsArtifactsDocsLink.displayName = 'TrustedAppsArtifactsDocsLink';
