/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  EuiButton,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  ALERTZERO_FEATURE_ID,
  SYSTEM_SECURITY_WORKER_CATALOG,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
} from '@kbn/alertzero-common';
import { AlertZeroPageSection } from '../../components/layout/alertzero_page_section';
import { useAlertZeroDocTitle } from '../../hooks/use_alertzero_doc_title';
import { useCurrentUser } from '../../hooks/use_current_user';
import { workerName } from '../watches/workers/translations';
import { useEnableWorkers } from './use_enable_workers';
import * as i18n from './translations';

// Ordered subset of catalog workers shown on the onboarding screen.
const ONBOARDING_WORKER_IDS = [
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
] as const;

type OnboardingWorkerId = (typeof ONBOARDING_WORKER_IDS)[number];
type WorkerToggleState = Record<OnboardingWorkerId, boolean>;

const initialToggleState = (): WorkerToggleState =>
  Object.fromEntries(ONBOARDING_WORKER_IDS.map((id) => [id, true])) as WorkerToggleState;

const onboardingWorkers = SYSTEM_SECURITY_WORKER_CATALOG.filter(({ id }) =>
  (ONBOARDING_WORKER_IDS as readonly string[]).includes(id)
).sort(
  (a, b) =>
    (ONBOARDING_WORKER_IDS as readonly string[]).indexOf(a.id) -
    (ONBOARDING_WORKER_IDS as readonly string[]).indexOf(b.id)
);

export const OnboardingPage: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const {
    services: { application },
  } = useKibana<CoreStart>();

  useAlertZeroDocTitle(i18n.ONBOARDING_TITLE);

  const canWrite = Boolean(application.capabilities[ALERTZERO_FEATURE_ID]?.write);

  const currentUserEmail = useCurrentUser();

  const history = useHistory();
  const [workerEnabled, setWorkerEnabled] = useState<WorkerToggleState>(initialToggleState);
  const { handleEnableAndContinue, isSaving } = useEnableWorkers(
    ONBOARDING_WORKER_IDS,
    workerEnabled,
    () => history.push('/watches')
  );

  const enabledCount = Object.values(workerEnabled).filter(Boolean).length;

  const handleToggle = (workerId: OnboardingWorkerId, checked: boolean) => {
    if (!checked && enabledCount <= 1) return;
    setWorkerEnabled((prev) => ({ ...prev, [workerId]: checked }));
  };

  if (!canWrite) {
    return (
      <AlertZeroPageSection>
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
          padding-block: ${euiTheme.size.xxl};
          align-self: center;
          max-width: 800px;
          width: 100%;
        `,
      }}
    >
      <EuiTitle>
        <h1>{i18n.ONBOARDING_TITLE}</h1>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText>
        <p>{i18n.ONBOARDING_SUBTITLE}</p>
      </EuiText>
      <EuiSpacer size="l" />

      <EuiPanel hasBorder hasShadow={false} paddingSize="none">
        {onboardingWorkers.map(({ id, name }, index) => {
          const wid = id as OnboardingWorkerId;
          const description = i18n.onboardingWorkerDescription(id);
          const checked = workerEnabled[wid];
          const isLastEnabled = checked && enabledCount <= 1;

          return (
            <React.Fragment key={id}>
              {index > 0 && <EuiHorizontalRule margin="none" />}
              <EuiFlexGroup
                alignItems="center"
                gutterSize="m"
                responsive={false}
                css={css`
                  padding: 12px 16px;
                `}
              >
                <EuiFlexItem>
                  <EuiText size="s">
                    <strong>{workerName(id, name)}</strong>
                    {description ? (
                      <>
                        {' — '}
                        {description}
                      </>
                    ) : null}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiSwitch
                    label={workerName(id, name)}
                    showLabel={false}
                    checked={checked}
                    disabled={isLastEnabled || isSaving}
                    onChange={(e) => handleToggle(wid, e.target.checked)}
                    data-test-subj={`alertZeroOnboardingWorkerToggle-${id}`}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </React.Fragment>
          );
        })}
        <EuiHorizontalRule margin="none" />
        <div
          css={css`
            padding: 8px 16px;
          `}
        >
          <EuiText size="xs" color="subdued">
            <p>{i18n.ONBOARDING_WORKERS_FOOTNOTE}</p>
          </EuiText>
        </div>
      </EuiPanel>

      <EuiSpacer size="m" />

      <EuiCallOut
        color="warning"
        iconType="warning"
        title={i18n.BEFORE_YOU_ENABLE_TITLE}
        data-test-subj="alertZeroOnboardingBeforeYouEnable"
      >
        <ul>
          <li>{i18n.beforeYouEnableRunsAs(currentUserEmail)}</li>
          <li>{i18n.BEFORE_YOU_ENABLE_LLM}</li>
          <li>
            <em>{i18n.BEFORE_YOU_ENABLE_PRIVILEGE}</em>
          </li>
          <li>{i18n.BEFORE_YOU_ENABLE_AUTONOMY}</li>
        </ul>
      </EuiCallOut>

      <EuiSpacer size="l" />

      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            isLoading={isSaving}
            onClick={handleEnableAndContinue}
            data-test-subj="alertZeroOnboardingEnableButton"
          >
            {i18n.ENABLE_AND_CONTINUE}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiLink
            onClick={() => application.navigateToApp('security')}
            data-test-subj="alertZeroOnboardingNotNowLink"
          >
            {i18n.NOT_NOW} &rarr;
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
    </AlertZeroPageSection>
  );
};
