/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { CloudForwarderPanel } from '../quickstart_flows/cloudforwarder';
import { PageTemplate } from './template';
import { CustomHeader } from '../header';

export const CloudForwarderPage = () => (
  <PageTemplate
    customHeader={
      <CustomHeader
        logo="opentelemetry"
        headlineCopy={i18n.translate(
          'xpack.observability_onboarding.experimentalOnboardingFlow.customHeader.cloudforwarder.text',
          {
            defaultMessage: 'Set up EDOT Cloud Forwarder for AWS',
          }
        )}
        captionCopy={i18n.translate(
          'xpack.observability_onboarding.experimentalOnboardingFlow.customHeader.cloudforwarder.caption.description',
          {
            defaultMessage:
              'Deploy the EDOT Cloud Forwarder as a Lambda function to forward logs from AWS S3 to Elastic.',
          }
        )}
      />
    }
  >
    <CloudForwarderPanel />
  </PageTemplate>
);
