/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { PageTemplate } from './template';
import { CustomHeader } from '../header';
import { OpencodePanel } from '../quickstart_flows/opencode';

export const OpencodePage = () => (
  <PageTemplate
    customHeader={
      <CustomHeader
        euiIconType="launch"
        headlineCopy={i18n.translate(
          'xpack.observability_onboarding.experimentalOnboardingFlow.customHeader.opencode.text',
          {
            defaultMessage: 'Elastic OpenCode Local Setup',
          }
        )}
        captionCopy={i18n.translate(
          'xpack.observability_onboarding.experimentalOnboardingFlow.customHeader.opencode.description',
          {
            defaultMessage:
              'Get the connection details for your locally running Elastic OpenCode distribution.',
          }
        )}
      />
    }
  >
    <OpencodePanel />
  </PageTemplate>
);
