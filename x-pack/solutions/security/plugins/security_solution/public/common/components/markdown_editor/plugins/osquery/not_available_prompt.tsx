/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCode, EuiEmptyPrompt } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { i18n } from '@kbn/i18n';

export const PERMISSION_DENIED = i18n.translate(
  'xpack.securitySolution.markdown.osquery.permissionDenied',
  {
    defaultMessage: 'Permission denied',
  }
);

export const OsqueryNotAvailablePrompt = () => (
  <EuiEmptyPrompt
    iconType="logoOsquery"
    title={<h2>{PERMISSION_DENIED}</h2>}
    titleSize="xs"
    body={
      <p>
        <FormattedMessage
          id="xpack.securitySolution.markdown.osquery.missingPrivileges"
          defaultMessage="To access this page, ask your administrator for {osquery} Kibana privileges."
          values={{
            osquery: <EuiCode>{'osquery'}</EuiCode>,
          }}
        />
      </p>
    }
  />
);
