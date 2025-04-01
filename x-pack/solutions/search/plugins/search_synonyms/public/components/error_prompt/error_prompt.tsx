/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

const ERROR_MESSAGES = {
  generic: {
    title: (
      <FormattedMessage id="xpack.search.synonyms.errorTitle" defaultMessage="An error occurred" />
    ),
    body: (
      <FormattedMessage
        id="xpack.search.synonyms.errorDescription"
        defaultMessage="An error occured while fetching synonyms. Check Kibana logs for more information."
      />
    ),
  },
  missingPermissions: {
    title: (
      <FormattedMessage
        id="xpack.search.synonyms.missingPermissionsTitle"
        defaultMessage="Missing permissions"
      />
    ),
    body: (
      <FormattedMessage
        id="xpack.search.synonyms.missingPermissionsDescription"
        defaultMessage="You do not have the necessary permissions to manage synonyms. Contact your system administrator."
      />
    ),
  },
};

export const ErrorPrompt: React.FC<{ errorType: 'missingPermissions' | 'generic' }> = ({
  errorType,
}) => {
  return (
    <EuiEmptyPrompt
      iconType="logoEnterpriseSearch"
      title={<h2>{ERROR_MESSAGES[errorType].title}</h2>}
      body={<p>{ERROR_MESSAGES[errorType].body}</p>}
    />
  );
};
