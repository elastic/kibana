/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiPanel,
  EuiSpacer,
  EuiTabbedContent,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiTabbedContentTab } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import type { ObservabilityOnboardingAppServices } from '../..';
import { AlertsSlosPanel } from './alerts_slos_panel';
import { MlJobsPanel } from './ml_jobs_panel';
import { useApmEnvironments } from './use_apm_environments';

export const DemoDataSection: React.FC = () => {
  const {
    services: { http, notifications, application },
  } = useKibana<ObservabilityOnboardingAppServices>();

  const accordionId = useGeneratedHtmlId({ prefix: 'demoDataSection' });
  const { environments, isLoading: isLoadingEnvironments } = useApmEnvironments(http);
  const canCreateMlJob = Boolean(application.capabilities.ml?.canCreateJob);

  const tabs: EuiTabbedContentTab[] = [
    {
      id: 'alerts-slos',
      name: i18n.translate('xpack.observability_onboarding.demoData.tab.alertsSlos', {
        defaultMessage: 'Alerts & SLOs',
      }),
      content: (
        <>
          <EuiSpacer size="m" />
          <AlertsSlosPanel
            http={http}
            notifications={notifications}
            environments={environments}
            isLoadingEnvironments={isLoadingEnvironments}
          />
        </>
      ),
    },
    {
      id: 'ml-jobs',
      name: i18n.translate('xpack.observability_onboarding.demoData.tab.mlJobs', {
        defaultMessage: 'ML jobs',
      }),
      content: (
        <>
          <EuiSpacer size="m" />
          <MlJobsPanel
            http={http}
            notifications={notifications}
            environments={environments}
            isLoadingEnvironments={isLoadingEnvironments}
            canCreateJob={canCreateMlJob}
          />
        </>
      ),
    },
  ];

  return (
    <EuiPanel
      hasBorder
      paddingSize="l"
      data-test-subj="observabilityOnboardingDemoDataSection"
      css={{ marginBottom: 24 }}
    >
      <EuiAccordion
        id={accordionId}
        buttonContent={
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.observability_onboarding.demoData.title', {
                defaultMessage: 'Demo data & Observability bootstrapping',
              })}
            </h3>
          </EuiTitle>
        }
      >
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('xpack.observability_onboarding.demoData.subtitle', {
              defaultMessage:
                'Quickly set up recommended alerts, SLOs and ML jobs to explore Observability.',
            })}
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} />
      </EuiAccordion>
    </EuiPanel>
  );
};
