/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { EuiCallOut, EuiSpacer, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ALERTZERO_FEATURE_ID } from '@kbn/alertzero-common';
import { AlertZeroPageHeader } from '../../components/alertzero_page_header';
import { AlertZeroPageSection } from '../../components/layout/alertzero_page_section';
import { ScanFailureCallout } from '../../components/scan_failure_callout/scan_failure_callout';
import { useAlertZeroDocTitle } from '../../hooks/use_alertzero_doc_title';
import { ONBOARDING_CONTENT_MAX_WIDTH } from './constants';
import { OnboardingEnableFooter } from './onboarding_enable_footer';
import { NoModelCallout } from './no_model_callout';
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
    isModelMissing,
    toggleWorker,
  } = useWorkerSelection();
  const { handleEnableAndContinue, isSaving } = useEnableWorkers(
    availableWorkerIds,
    workerEnabled,
    () => history.push('/watches'),
    onSavingChange
  );

  if (step === 'intro') {
    return (
      <OnboardingIntro
        onContinue={() => setStep('workers')}
        continueDisabledReason={canWrite ? undefined : i18n.ONBOARDING_CONTINUE_REQUIRES_WRITE}
      />
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

        {isModelMissing ? (
          <>
            <NoModelCallout />
            <EuiSpacer size="l" />
          </>
        ) : null}

        <WorkerSelectionList
          workers={workers}
          serverWorkers={serverWorkers}
          workerEnabled={workerEnabled}
          enabledCount={enabledCount}
          isSaving={isSaving}
          isLocked={!canModifyWorkers || isModelMissing}
          onToggle={toggleWorker}
        />
      </div>

      <OnboardingEnableFooter
        selectedCount={enabledCount}
        totalCount={availableWorkerIds.length}
        isSaving={isSaving}
        isEnableDisabled={
          availableWorkerIds.length === 0 ||
          enabledCount === 0 ||
          !canModifyWorkers ||
          isModelMissing
        }
        onEnable={handleEnableAndContinue}
        onBack={() => setStep('intro')}
      />
    </AlertZeroPageSection>
  );
};
