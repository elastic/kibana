/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

export const EA_ML_JOB_CALLOUT_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.eaMlJobCallout.title',
  {
    defaultMessage: 'New Entity Analytics ML jobs available',
  }
);

export const EaMlJobCalloutBody = () => (
  <FormattedMessage
    id="xpack.securitySolution.entityAnalytics.eaMlJobCallout.body"
    defaultMessage="{summary}{recommendation}"
    values={{
      summary: (
        <p>
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.eaMlJobCallout.body.summary"
            defaultMessage='With version 9.4, Elastic Stack introduces support for Entity Analytics (EA), adding new fields for proper entity resolution. The machine learning jobs created from this version onward are designed to leverage these fields. The impacted ML jobs will include an "_ea" suffix in their names. Previously installed ML jobs and detection rules will continue to run, allowing time to transition to the new Entity Analytics fields.'
          />
        </p>
      ),
      recommendation: (
        <p>
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.eaMlJobCallout.body.recommendation"
            defaultMessage="We recommend installing the new ML jobs first and verifying that they are properly set up, collecting data, and generating anomalies before upgrading to the latest detection rules included in 9.4."
          />
        </p>
      ),
    }}
  />
);
