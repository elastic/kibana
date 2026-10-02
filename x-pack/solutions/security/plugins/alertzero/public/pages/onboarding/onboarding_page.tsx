/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  EuiBadge,
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
  resolveWatchAccent,
  SYSTEM_SECURITY_WATCH_CATALOG,
  SYSTEM_SECURITY_WORKER_CATALOG,
} from '@kbn/alertzero-common';
import { SECURITY_APP_ID } from '@kbn/deeplinks-security';
import { AlertZeroPageSection } from '../../components/layout/alertzero_page_section';
import { ScanFailureCallout } from '../../components/scan_failure_callout/scan_failure_callout';
import { useAlertZeroDocTitle } from '../../hooks/use_alertzero_doc_title';
import { useCurrentUser } from '../../hooks/use_current_user';
import { useWorkers } from '../../hooks/use_workers_api';
import { workerScheduleCadenceLabel } from '../watches/components/worker_trigger_cadence';
import { workerName } from '../watches/workers/translations';
import { useEnableWorkers } from './use_enable_workers';
import { ONBOARDING_CONTENT_MAX_WIDTH, ONBOARDING_READ_MORE_URL_PLACEHOLDER } from './constants';
import { OnboardingEnableFooter } from './onboarding_enable_footer';
import * as i18n from './translations';

type WorkerToggleState = Record<string, boolean>;

const initialToggleState = (): WorkerToggleState =>
  Object.fromEntries(SYSTEM_SECURITY_WORKER_CATALOG.map(({ id }) => [id, true]));

interface Props {
  onSavingChange?: (saving: boolean) => void;
}

export const OnboardingPage: React.FC<Props> = ({ onSavingChange }) => {
  const { euiTheme } = useEuiTheme();
  const {
    services: { application },
  } = useKibana<CoreStart>();

  useAlertZeroDocTitle(i18n.ONBOARDING_TITLE);

  const canWrite = Boolean(application.capabilities[ALERTZERO_FEATURE_ID]?.write);

  const currentUserEmail = useCurrentUser();

  // Intersect the server-returned worker list with the catalog so skill-gated workers
  // absent from the response are not shown as toggles (or counted toward the minimum).
  const { data: workersData } = useWorkers();
  const serverWorkers = useMemo(
    () => new Map((workersData?.workers ?? []).map((w) => [w.id, w])),
    [workersData]
  );
  const serverWorkerIds = useMemo(() => new Set(serverWorkers.keys()), [serverWorkers]);
  const onboardingWorkers = useMemo(
    () => SYSTEM_SECURITY_WORKER_CATALOG.filter(({ id }) => serverWorkerIds.has(id)),
    [serverWorkerIds]
  );
  const availableWorkerIds = useMemo(
    () => onboardingWorkers.map(({ id }) => id),
    [onboardingWorkers]
  );

  const history = useHistory();
  const [workerEnabled, setWorkerEnabled] = useState<WorkerToggleState>(initialToggleState);
  const { handleEnableAndContinue, isSaving } = useEnableWorkers(
    availableWorkerIds,
    workerEnabled,
    () => history.push('/watches'),
    onSavingChange
  );

  const enabledCount = availableWorkerIds.filter((id) => workerEnabled[id]).length;

  const handleToggle = (workerId: string, checked: boolean) => {
    if (!checked && enabledCount <= 1) return;
    setWorkerEnabled((prev) => ({ ...prev, [workerId]: checked }));
  };

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
        <EuiTitle>
          <h1>{i18n.ONBOARDING_TITLE}</h1>
        </EuiTitle>
        <EuiSpacer size="l" />
        <EuiTitle size="xs">
          <h2>{i18n.ONBOARDING_INTRO_HEADING}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText>
          <p>{i18n.ONBOARDING_SUBTITLE}</p>
          <p>
            <EuiLink
              href={ONBOARDING_READ_MORE_URL_PLACEHOLDER}
              target="_blank"
              external
              data-test-subj="alertZeroOnboardingReadMoreLink"
            >
              {i18n.READ_MORE}
            </EuiLink>
          </p>
        </EuiText>
        <EuiSpacer size="l" />

        <ScanFailureCallout />

        <EuiPanel hasBorder hasShadow={false} paddingSize="none">
          {onboardingWorkers.length === 0 ? (
            <div
              css={css`
                padding: 16px;
              `}
              data-test-subj="alertZeroOnboardingNoWorkersAvailable"
            >
              <EuiText size="s" color="subdued">
                <p>{i18n.ONBOARDING_NO_WORKERS_AVAILABLE}</p>
              </EuiText>
            </div>
          ) : (
            <>
              {onboardingWorkers.map(({ id, name, watchId }, index) => {
                const description = i18n.onboardingWorkerDescription(id);
                const watch = SYSTEM_SECURITY_WATCH_CATALOG.find((entry) => entry.id === watchId);
                const scheduleInterval = serverWorkers.get(id)?.settings?.scheduleInterval;
                const triggerLabel = scheduleInterval
                  ? workerScheduleCadenceLabel(scheduleInterval)
                  : i18n.onboardingWorkerEventTrigger(id);
                const checked = workerEnabled[id] ?? false;
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
                        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
                          <EuiFlexItem grow={false}>
                            <EuiText size="s">
                              <strong>{workerName(id, name)}</strong>
                            </EuiText>
                          </EuiFlexItem>
                          {watch ? (
                            <EuiFlexItem grow={false}>
                              <EuiBadge
                                color={resolveWatchAccent(euiTheme.colors, watch.color)}
                                data-test-subj={`alertZeroOnboardingWorkerWatch-${id}`}
                              >
                                {watch.name}
                              </EuiBadge>
                            </EuiFlexItem>
                          ) : null}
                          {triggerLabel ? (
                            <EuiFlexItem grow={false}>
                              <EuiBadge
                                color="hollow"
                                data-test-subj={`alertZeroOnboardingWorkerTrigger-${id}`}
                              >
                                {triggerLabel}
                              </EuiBadge>
                            </EuiFlexItem>
                          ) : null}
                        </EuiFlexGroup>
                        {description ? (
                          <EuiText size="s" color="subdued">
                            <p id={`alertZeroOnboardingWorkerDescription-${id}`}>{description}</p>
                          </EuiText>
                        ) : null}
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiSwitch
                          label={workerName(id, name)}
                          showLabel={false}
                          checked={checked}
                          disabled={isLastEnabled || isSaving}
                          onChange={(e) => handleToggle(id, e.target.checked)}
                          data-test-subj={`alertZeroOnboardingWorkerToggle-${id}`}
                          aria-describedby={
                            description ? `alertZeroOnboardingWorkerDescription-${id}` : undefined
                          }
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
            </>
          )}
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
      </div>

      <OnboardingEnableFooter
        selectedCount={enabledCount}
        totalCount={availableWorkerIds.length}
        isSaving={isSaving}
        isEnableDisabled={availableWorkerIds.length === 0 || enabledCount === 0}
        onEnable={handleEnableAndContinue}
        onNotNow={() => application.navigateToApp(SECURITY_APP_ID)}
      />
    </AlertZeroPageSection>
  );
};
