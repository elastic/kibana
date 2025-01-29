/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { FirehosePanel } from '../quickstart_flows/firehose';
import { PageTemplate } from './template';
import { CustomHeader } from '../header';

export const FirehosePage = () => (
  <PageTemplate
    customHeader={
      <CustomHeader
        logo="firehose"
        headlineCopy={i18n.translate(
          'xpack.observability_onboarding.experimentalOnboardingFlow.customHeader.firehose.text',
          {
            defaultMessage: 'Set up Amazon Data Firehose',
          }
        )}
        captionCopy={i18n.translate(
          'xpack.observability_onboarding.experimentalOnboardingFlow.customHeader.firehose.caption.description',
          {
            defaultMessage:
              'This installation is tailored for setting up Firehose in your Observability project with minimal configuration.',
          }
        )}
      />
    }
  >
    <FirehosePanel />
  </PageTemplate>
);
