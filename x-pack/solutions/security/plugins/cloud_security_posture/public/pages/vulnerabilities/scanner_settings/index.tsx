/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useQueryClient } from '@kbn/react-query';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import type { OnboardingPlan } from '@kbn/cloud-security-posture-common/native_vuln_scanner/types';
import { useKibana } from '../../../common/hooks/use_kibana';
import {
  NATIVE_VULN_SCANNER_STATUS_QUERY_KEY,
  isInsufficientLicense,
  useNativeVulnScannerClient,
  useNativeVulnScannerStatus,
} from '../../../common/api/use_native_vuln_scanner_api';
import { applyOnboarding, requestInventory } from './apply_onboarding';
import type { ApplyOnboardingResult } from './apply_onboarding';
import { ApplyResults } from './apply_results';
import { ConfirmEnableModal } from './confirm_enable_modal';
import { getHttpErrorInfo } from './http_error';
import { PolicyCallouts } from './policy_callouts';
import { PolicyTable } from './policy_table';
import { ScanSection } from './scan_section';
import { ScannerExplainer } from './scanner_explainer';
import { getCollectInventoryText } from './translations';
import { SCANNER_SETTINGS_TEST_SUBJECTS } from './test_subjects';

/** How long to wait for a started scan to show up as running before the page stops waiting. */
export const SCAN_START_GRACE_MS = 60000;

/**
 * How long after an apply a policy may still be waiting for its first inventory before the page
 * requests it once more. A live query that raced the osquerybeat restart is never answered.
 */
export const INVENTORY_RETRY_MS = 60000;

const PAGE_TITLE = i18n.translate('xpack.csp.nativeVulnScanner.page.title', {
  defaultMessage: 'Host vulnerability scanning',
});

export const ScannerSettingsPage = () => {
  const client = useNativeVulnScannerClient();
  const queryClient = useQueryClient();
  const { fleet, application, notifications } = useKibana().services;

  const [awaitingScan, setAwaitingScan] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [plan, setPlan] = useState<OnboardingPlan | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applyResult, setApplyResult] = useState<ApplyOnboardingResult | null>(null);
  const [deniedByServer, setDeniedByServer] = useState(false);
  const [collectingIds, setCollectingIds] = useState<string[]>([]);

  const { data: status, isLoading } = useNativeVulnScannerStatus({ awaitingScan });

  // The scan counts as started once a run shows as running or a new summary appears.
  const scanBaselineRunId = useRef<string | undefined>();
  const scanSeenRunning = useRef(false);

  const onScanStarted = useCallback(() => {
    scanBaselineRunId.current =
      status && !isInsufficientLicense(status) ? status.lastScan?.run_id : undefined;
    scanSeenRunning.current = false;
    setAwaitingScan(true);
  }, [status]);

  useEffect(() => {
    if (!awaitingScan || !status || isInsufficientLicense(status)) return;
    if (status.scanRunning) {
      scanSeenRunning.current = true;
      return;
    }
    if (scanSeenRunning.current || status.lastScan?.run_id !== scanBaselineRunId.current) {
      setAwaitingScan(false);
    }
  }, [awaitingScan, status]);

  // A run can end SKIPPED before it is ever seen as running, so waiting has to end by itself.
  useEffect(() => {
    if (!awaitingScan) return;
    const timer = setTimeout(() => {
      // Once the run was seen, the effect above ends the wait when it finishes.
      if (!scanSeenRunning.current) setAwaitingScan(false);
    }, SCAN_START_GRACE_MS);
    return () => clearTimeout(timer);
  }, [awaitingScan]);

  const canEdit = fleet.authz.fleet.allAgentPolicies && !deniedByServer;
  // Running a pack as a live query needs `readPacks` plus either `writeLiveQueries` or
  // `runSavedQueries` (see the osquery live query authz). `readPacks` alone, as the osquery read
  // privilege grants, would only produce a 403.
  const { readPacks, writeLiveQueries, runSavedQueries } = application.capabilities.osquery ?? {};
  const canRunPack = readPacks === true && (writeLiveQueries === true || runSavedQueries === true);

  const refreshStatus = () => queryClient.invalidateQueries([NATIVE_VULN_SCANNER_STATUS_QUERY_KEY]);

  const retryTimer = useRef<ReturnType<typeof setTimeout> | undefined>();
  const cancelInventoryRetry = useCallback(() => {
    clearTimeout(retryTimer.current);
    retryTimer.current = undefined;
  }, []);
  useEffect(() => cancelInventoryRetry, [cancelInventoryRetry]);

  // One retry per apply, never re-armed: it covers a first request lost to the pin restart, and
  // policies whose pin was `no_change` but are still pending from an earlier lost request.
  const scheduleInventoryRetry = (policyIds: string[]) => {
    cancelInventoryRetry();
    if (!canRunPack || policyIds.length === 0) return;
    retryTimer.current = setTimeout(async () => {
      retryTimer.current = undefined;
      try {
        const fresh = await client.getStatus();
        if (isInsufficientLicense(fresh)) return;
        const { packId } = fresh.pack;
        const stillPending = fresh.policies
          .filter(({ id, state }) => state === 'pending_inventory' && policyIds.includes(id))
          .map(({ id }) => id);
        if (!packId || stillPending.length === 0) return;
        await requestInventory(client, packId, stillPending);
      } catch {
        // A failed retry changes nothing: the daily schedule and the per-row action remain.
      } finally {
        refreshStatus();
      }
    }, INVENTORY_RETRY_MS);
  };

  const packId = status && !isInsufficientLicense(status) ? status.pack.packId : undefined;

  const onCollectInventory = async (policyId: string) => {
    if (!packId) return;
    setCollectingIds((ids) => [...ids, policyId]);
    try {
      const result = await requestInventory(client, packId, [policyId]);
      const text = getCollectInventoryText(result);
      if (result.status === 'started') notifications.toasts.addSuccess(text);
      else if (result.status === 'failed') notifications.toasts.addDanger(text);
      else notifications.toasts.addWarning(text);
    } finally {
      setCollectingIds((ids) => ids.filter((id) => id !== policyId));
      refreshStatus();
    }
  };

  const onEnable = async () => {
    setIsPlanning(true);
    setPlanError(null);
    setApplyError(null);
    setApplyResult(null);
    try {
      setPlan(await client.getPlan(selectedIds));
    } catch (e) {
      const { status: httpStatus, message } = getHttpErrorInfo(e);
      if (httpStatus === 403) setDeniedByServer(true);
      setPlanError(message ?? '');
    } finally {
      setIsPlanning(false);
    }
  };

  const onConfirm = async () => {
    if (!plan) return;
    setIsApplying(true);
    cancelInventoryRetry();
    try {
      const result = await applyOnboarding(client, plan, selectedIds);
      setApplyResult(result);
      setSelectedIds([]);
      scheduleInventoryRetry(
        result.policies
          .filter(({ outcome }) => outcome === 'updated' || outcome === 'no_change')
          .map(({ id }) => id)
      );
    } catch (e) {
      const { status: httpStatus, message } = getHttpErrorInfo(e);
      if (httpStatus === 403) setDeniedByServer(true);
      setApplyError(message ?? '');
    } finally {
      setIsApplying(false);
      setPlan(null);
      refreshStatus();
    }
  };

  if (isLoading) {
    return (
      <EuiPanel hasBorder data-test-subj={SCANNER_SETTINGS_TEST_SUBJECTS.LOADING}>
        <EuiLoadingSpinner size="l" />
      </EuiPanel>
    );
  }

  // A failed background refetch keeps the last good data, so only a first load without data errors.
  if (!status) {
    return (
      <KbnDangerCallout
        announceOnMount
        title={i18n.translate('xpack.csp.nativeVulnScanner.page.loadError', {
          defaultMessage: 'The scanner status could not be loaded',
        })}
        data-test-subj={SCANNER_SETTINGS_TEST_SUBJECTS.ERROR}
      />
    );
  }

  if (isInsufficientLicense(status)) {
    return (
      <EuiEmptyPrompt
        iconType="lock"
        color="subdued"
        title={<h2>{PAGE_TITLE}</h2>}
        body={
          <p>
            {i18n.translate('xpack.csp.nativeVulnScanner.page.upgradeBody', {
              defaultMessage:
                'Scanning hosts with Elastic Agent needs an Enterprise license. Upgrade your license to use it.',
            })}
          </p>
        }
        data-test-subj={SCANNER_SETTINGS_TEST_SUBJECTS.UPGRADE_CALLOUT}
      />
    );
  }

  return (
    <div data-test-subj={SCANNER_SETTINGS_TEST_SUBJECTS.PAGE}>
      <EuiSpacer size="l" />
      <EuiTitle size="m">
        <h1>{PAGE_TITLE}</h1>
      </EuiTitle>
      <EuiSpacer size="m" />
      {!canEdit && (
        <>
          <KbnWarningCallout
            announceOnMount
            size="s"
            title={i18n.translate('xpack.csp.nativeVulnScanner.page.readOnlyTitle', {
              defaultMessage: 'Read-only view',
            })}
            text={i18n.translate('xpack.csp.nativeVulnScanner.page.readOnlyBody', {
              defaultMessage:
                'Enabling scanning and starting scans need the Fleet "All" privilege for agent policies. Ask an administrator for access.',
            })}
            data-test-subj={SCANNER_SETTINGS_TEST_SUBJECTS.READ_ONLY_CALLOUT}
          />
          <EuiSpacer size="m" />
        </>
      )}
      <ScannerExplainer />
      <EuiSpacer size="l" />
      <PolicyCallouts status={status} />
      <EuiPanel hasBorder paddingSize="l">
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h2>
                {i18n.translate('xpack.csp.nativeVulnScanner.page.policiesTitle', {
                  defaultMessage: 'Agent policies',
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              size="s"
              onClick={onEnable}
              isDisabled={!canEdit || selectedIds.length === 0}
              isLoading={isPlanning}
              data-test-subj={SCANNER_SETTINGS_TEST_SUBJECTS.ENABLE_BUTTON}
            >
              {i18n.translate('xpack.csp.nativeVulnScanner.page.enable', {
                defaultMessage: 'Enable on selected policies',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <PolicyTable
          policies={status.policies}
          agentsVisible={status.agentsVisible}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          canSelect={canEdit}
          onCollectInventory={canRunPack && packId ? onCollectInventory : undefined}
          collectingIds={collectingIds}
        />
        {planError !== null && (
          <>
            <EuiSpacer size="m" />
            <KbnDangerCallout
              announceOnMount
              size="s"
              title={i18n.translate('xpack.csp.nativeVulnScanner.page.planError', {
                defaultMessage: 'The changes could not be previewed',
              })}
              text={planError || undefined}
              data-test-subj={SCANNER_SETTINGS_TEST_SUBJECTS.PLAN_ERROR}
            />
          </>
        )}
        {applyError !== null && (
          <>
            <EuiSpacer size="m" />
            <KbnDangerCallout
              announceOnMount
              size="s"
              title={i18n.translate('xpack.csp.nativeVulnScanner.page.applyError', {
                defaultMessage: 'Scanning could not be enabled',
              })}
              text={applyError || undefined}
              data-test-subj={SCANNER_SETTINGS_TEST_SUBJECTS.APPLY_ERROR}
            />
          </>
        )}
        {applyResult && (
          <>
            <EuiSpacer size="m" />
            <ApplyResults result={applyResult} />
          </>
        )}
      </EuiPanel>
      <EuiSpacer size="l" />
      <ScanSection
        status={status}
        canEdit={canEdit}
        awaitingScan={awaitingScan}
        onScanStarted={onScanStarted}
        onForbidden={() => setDeniedByServer(true)}
      />
      {plan && (
        <ConfirmEnableModal
          plan={plan}
          isApplying={isApplying}
          onConfirm={onConfirm}
          onCancel={() => setPlan(null)}
        />
      )}
    </div>
  );
};
