/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const MissingPermissionsPrompt = () => {
  return (
    <EuiEmptyPrompt
      iconType="logoEnterpriseSearch"
      title={
        <h2>
          <FormattedMessage
            id="xpack.search.synonyms.missingPermissionsTitle"
            defaultMessage="Missing permissions"
          />
        </h2>
      }
      body={
        <p>
          <FormattedMessage
            id="xpack.search.synonyms.missingPermissionsDescription"
            defaultMessage="You do not have the necessary permissions to manage synonyms. Contact your system administrator."
          />
        </p>
      }
    />
  );
};
