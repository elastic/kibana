/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { PageTemplate } from './template';
import { CustomHeader } from '../header/custom_header';
import { AgentOnboardingPanel } from '../quickstart_flows/agent_onboarding';

export const AgentOnboardingPage = () => {
  return (
    <PageTemplate
      customHeader={
        <CustomHeader
          euiIconType="sparkles"
          headlineCopy={i18n.translate(
            'xpack.observability_onboarding.agentOnboardingPage.header.title',
            { defaultMessage: 'AI-guided onboarding' }
          )}
          captionCopy={i18n.translate(
            'xpack.observability_onboarding.agentOnboardingPage.header.description',
            {
              defaultMessage:
                'Let Claude Code auto-detect your systems and set up observability from your terminal.',
            }
          )}
          isTechnicalPreview
        />
      }
    >
      <AgentOnboardingPanel />
    </PageTemplate>
  );
};
