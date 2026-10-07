/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  EuiCallOut,
  EuiEmptyPrompt,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ALERTZERO_FEATURE_ID } from '@kbn/alertzero-common';
import { SECURITY_APP_ID } from '@kbn/deeplinks-security';
import { AlertZeroPageHeader } from '../../components/alertzero_page_header';
import { AlertZeroPageSection } from '../../components/layout/alertzero_page_section';
import { ScanFailureCallout } from '../../components/scan_failure_callout/scan_failure_callout';
import { useAlertZeroDocTitle } from '../../hooks/use_alertzero_doc_title';
import { ServiceAccountField } from '../watches/components/service_account_field';
import { ONBOARDING_CONTENT_MAX_WIDTH } from './constants';
import { OnboardingEnableFooter } from './onboarding_enable_footer';
import { OnboardingIntro } from './onboarding_intro';
import { useEnableWorkers } from './use_enable_workers';
import { useWorkerSelection } from './use_worker_selection';
import { WorkerSelectionDescription } from './worker_selection_description';
import { WorkerSelectionList } from './worker_selection_list';
import * as i18n from './translations';

interface Props {
  onSavingChange?: (saving: boolean) => void;
}

export const OnboardingPage: React.FC<Props> = ({ onSavingChange }) => {
  const { euiTheme } = useEuiTheme();
  const {
    services: { application },
  } = useKibana<CoreStart>();
  const history = useHistory();
  const [step, setStep] = useState<'intro' | 'workers'>('intro');

  useAlertZeroDocTitle(i18n.ONBOARDING_TITLE);

  const canWrite = Boolean(application.capabilities[ALERTZERO_FEATURE_ID]?.write);

  const {
    workers,
    serverWorkers,
    availableWorkerIds,
    workerEnabled,
    enabledCount,
    canModifyWorkers,
    toggleWorker,
  } = useWorkerSelection();
  const [serviceAccountId, setServiceAccountId] = useState<string | undefined>();
  const { handleEnableAndContinue, isSaving } = useEnableWorkers(
    availableWorkerIds,
    workerEnabled,
    serviceAccountId,
    () => history.push('/watches'),
    onSavingChange
  );

  if (step === 'intro') {
    return <OnboardingIntro onContinue={() => setStep('workers')} />;
  }

  if (!canWrite) {
    return (
      <AlertZeroPageSection>
        <ScanFailureCallout />
        <EuiEmptyPrompt
          iconType="watchesApp"
          title={<h2>{i18n.ONBOARDING_TITLE}</h2>}
          body={<p>{i18n.ONBOARDING_READ_ONLY_BODY}</p>}
        />
      </AlertZeroPageSection>
    );
  }

  return (
    <AlertZeroPageSection
      contentProps={{
        css: css`
          display: flex;
          flex-direction: column;
          flex-grow: 1;
          padding-block: 0;
          width: 100%;
        `,
      }}
    >
      <div
        css={css`
          flex-grow: 1;
          align-self: center;
          max-width: ${ONBOARDING_CONTENT_MAX_WIDTH};
          padding-block: ${euiTheme.size.xxl};
          width: 100%;
        `}
      >
        <AlertZeroPageHeader greeting={i18n.ONBOARDING_GREETING} title={i18n.ONBOARDING_TITLE} />
        <EuiSpacer size="l" />
        <EuiTitle size="xs">
          <h2>{i18n.ONBOARDING_WATCHES_HEADING}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <WorkerSelectionDescription
          isSaving={isSaving}
          onWatchSettingsClick={() => history.push('/watches')}
        />
        <EuiSpacer size="l" />

        <ScanFailureCallout />

        {canModifyWorkers ? null : (
          <>
            <EuiCallOut
              announceOnMount
              color="warning"
              iconType="lock"
              data-test-subj="alertZeroOnboardingModifyForbidden"
            >
              {i18n.ONBOARDING_MODIFY_FORBIDDEN}
            </EuiCallOut>
            <EuiSpacer size="l" />
          </>
        )}

        <WorkerSelectionList
          workers={workers}
          serverWorkers={serverWorkers}
          workerEnabled={workerEnabled}
          enabledCount={enabledCount}
          isSaving={isSaving}
          canModifyWorkers={canModifyWorkers}
          onToggle={toggleWorker}
        />

        <EuiSpacer size="l" />
        <EuiPanel
          hasBorder
          hasShadow={false}
          paddingSize="m"
          data-test-subj="alertZeroOnboardingServiceAccount"
        >
          <EuiText size="s">
            <strong>{i18n.SERVICE_ACCOUNT_LABEL}</strong>
          </EuiText>
          <EuiSpacer size="s" />
          <ServiceAccountField
            workerId="onboarding"
            workerName={i18n.SERVICE_ACCOUNT_LABEL}
            ariaLabel={i18n.SERVICE_ACCOUNT_LABEL}
            current={serviceAccountId}
            isDisabled={!canModifyWorkers || isSaving}
            onChange={(nextId) => setServiceAccountId(nextId ?? undefined)}
          />
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued">
            <p>{i18n.BEFORE_YOU_ENABLE_RUNS_AS}</p>
          </EuiText>
        </EuiPanel>
      </div>

      <OnboardingEnableFooter
        selectedCount={enabledCount}
        totalCount={availableWorkerIds.length}
        isSaving={isSaving}
        isEnableDisabled={
          availableWorkerIds.length === 0 ||
          enabledCount === 0 ||
          !canModifyWorkers ||
          serviceAccountId == null
        }
        onEnable={handleEnableAndContinue}
        onBack={() => application.navigateToApp(SECURITY_APP_ID)}
      />
    </AlertZeroPageSection>
  );
};
