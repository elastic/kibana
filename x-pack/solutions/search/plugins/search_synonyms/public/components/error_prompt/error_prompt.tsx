/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const ErrorPrompt = () => {
  return (
    <EuiEmptyPrompt
      iconType="logoEnterpriseSearch"
      title={
        <h2>
          <FormattedMessage
            id="xpack.search.synonyms.errorTitle"
            defaultMessage="An error occurred"
          />
        </h2>
      }
      body={
        <p>
          <FormattedMessage
            id="xpack.search.synonyms.errorDescription"
            defaultMessage="An error occured while fetching synonyms. Check Kibana logs for more information."
          />
        </p>
      }
    />
  );
};
