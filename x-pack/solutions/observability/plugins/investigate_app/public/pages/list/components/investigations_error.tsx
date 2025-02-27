/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';

export function InvestigationsError() {
  return (
    <EuiEmptyPrompt
      iconType="error"
      color="danger"
      title={
        <h2>
          {i18n.translate('xpack.investigateApp.InvestigationsNotFound.title', {
            defaultMessage: 'Unable to load investigations',
          })}
        </h2>
      }
      body={
        <p>
          {i18n.translate('xpack.investigateApp.InvestigationsNotFound.body', {
            defaultMessage:
              'There was an error loading the investigations. Contact your administrator for help.',
          })}
        </p>
      }
    />
  );
}
