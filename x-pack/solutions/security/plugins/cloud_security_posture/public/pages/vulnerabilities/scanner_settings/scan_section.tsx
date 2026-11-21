/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { AppStatus } from '@kbn/core/public';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout, KbnSuccessCallout } from '@kbn/ui-callout';
import { FormattedDate, FormattedTime } from '@kbn/i18n-react';
import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import { WORKFLOWS_MANAGEMENT_FEATURE_ID } from '@kbn/workflows/common/constants';
import { WorkflowsManagementUiActions } from '@kbn/workflows/common/privileges';
import { NATIVE_VULN_SCANNER_SCAN_WORKFLOW_ID } from '@kbn/cloud-security-posture-common/native_vuln_scanner/constants';
import type {
  OnboardingStatus,
  SummaryDoc,
  SummaryFeed,
  SummaryFeedStatus,
} from '@kbn/cloud-security-posture-common/native_vuln_scanner/types';
import {
  NATIVE_VULN_SCANNER_STATUS_QUERY_KEY,
  useNativeVulnScannerClient,
} from '../../../common/api/use_native_vuln_scanner_api';
import { useKibana } from '../../../common/hooks/use_kibana';
import { getHttpErrorInfo } from './http_error';
import { getFeedStatusLabel, getRunStatusLabel, getScanErrorText } from './translations';
import { SCANNER_SETTINGS_TEST_SUBJECTS } from './test_subjects';

interface ScanSectionProps {
  status: OnboardingStatus;
  canEdit: boolean;
  /** True from "Scan now" until the run is seen to finish. */
  awaitingScan: boolean;
  onScanStarted: () => void;
  /** Called when the server answers 403, so the page can switch to read-only. */
  onForbidden: () => void;
}

const FEED_COLORS: Record<SummaryFeedStatus, string> = {
  matched: 'success',
  unavailable: 'default',
  failed: 'danger',
  skipped: 'accent',
};

const FEED_COLUMNS: Array<EuiBasicTableColumn<SummaryFeed>> = [
  {
    field: 'release',
    name: i18n.translate('xpack.csp.nativeVulnScanner.lastScan.releaseColumn', {
      defaultMessage: 'Release',
    }),
  },
  {
    field: 'status',
    name: i18n.translate('xpack.csp.nativeVulnScanner.lastScan.feedStatusColumn', {
      defaultMessage: 'Feed',
    }),
    render: (feedStatus: SummaryFeedStatus) => (
      <EuiBadge color={FEED_COLORS[feedStatus]}>{getFeedStatusLabel(feedStatus)}</EuiBadge>
    ),
  },
  {
    field: 'error',
    name: i18n.translate('xpack.csp.nativeVulnScanner.lastScan.messageColumn', {
      defaultMessage: 'Message',
    }),
    render: (error: string | undefined) => error ?? '',
  },
];

/** Privileges the Workflows app and its Executions tab need to show a managed workflow's run. */
const WORKFLOWS_RUN_VIEW_ACTIONS = [
  WorkflowsManagementUiActions.read,
  WorkflowsManagementUiActions.readManaged,
  WorkflowsManagementUiActions.readExecution,
  WorkflowsManagementUiActions.readManagedExecution,
];

const getFeedRowId = ({ release }: SummaryFeed) => ({ 'data-test-subj': `feed-${release}` });

/**
 * Link to the scan's workflow execution, or undefined when the run is unknown or the viewer cannot
 * open it: the workflows app is not registered or inaccessible, the viewer lacks the privileges the
 * execution view needs, or the active space is not the default one (the scan workflow is installed
 * there only).
 */
const useViewRunHref = (runId: string | undefined): string | undefined => {
  const { application, spaces } = useKibana().services;
  const applications = useObservable(application.applications$);
  const activeSpace = useObservable(useMemo(() => spaces.getActiveSpace$(), [spaces]));

  if (!runId) return undefined;
  if (applications?.get(WORKFLOWS_APP_ID)?.status !== AppStatus.accessible) return undefined;
  if (activeSpace?.id !== DEFAULT_SPACE_ID) return undefined;

  const workflowsCapabilities = application.capabilities?.[WORKFLOWS_MANAGEMENT_FEATURE_ID];
  const canView = WORKFLOWS_RUN_VIEW_ACTIONS.every(
    (action) => workflowsCapabilities?.[action] === true
  );
  if (!canView) return undefined;

  return application.getUrlForApp(WORKFLOWS_APP_ID, {
    path: `/${encodeURIComponent(
      NATIVE_VULN_SCANNER_SCAN_WORKFLOW_ID
    )}?tab=executions&executionId=${encodeURIComponent(runId)}`,
  });
};

const LastScanPanel = ({ lastScan }: { lastScan: SummaryDoc | null }) => {
  const viewRunHref = useViewRunHref(lastScan?.run_id);

  if (!lastScan) {
    return (
      <EuiText size="s" color="subdued" data-test-subj={SCANNER_SETTINGS_TEST_SUBJECTS.NO_SCAN_YET}>
        <p>
          {i18n.translate('xpack.csp.nativeVulnScanner.lastScan.none', {
            defaultMessage: 'No scan has finished yet.',
          })}
        </p>
      </EuiText>
    );
  }

  const finishedAt = new Date(lastScan.finished_at);

  return (
    <div data-test-subj={SCANNER_SETTINGS_TEST_SUBJECTS.LAST_SCAN_PANEL}>
      <EuiFlexGroup gutterSize="l" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>
              {i18n.translate('xpack.csp.nativeVulnScanner.lastScan.time', {
                defaultMessage: 'Finished',
              })}
            </strong>
            <p>
              <FormattedDate value={finishedAt} month="short" day="numeric" year="numeric" />{' '}
              <FormattedTime value={finishedAt} />
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>
              {i18n.translate('xpack.csp.nativeVulnScanner.lastScan.status', {
                defaultMessage: 'Status',
              })}
            </strong>
            <p>{getRunStatusLabel(lastScan.status)}</p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>
              {i18n.translate('xpack.csp.nativeVulnScanner.lastScan.hosts', {
                defaultMessage: 'Hosts scanned',
              })}
            </strong>
            <p>{lastScan.hosts_scanned}</p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>
              {i18n.translate('xpack.csp.nativeVulnScanner.lastScan.findings', {
                defaultMessage: 'Open findings',
              })}
            </strong>
            <p>{lastScan.findings_open}</p>
          </EuiText>
        </EuiFlexItem>
        {viewRunHref && (
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <EuiLink
                href={viewRunHref}
                data-test-subj={SCANNER_SETTINGS_TEST_SUBJECTS.VIEW_RUN_LINK}
              >
                {i18n.translate('xpack.csp.nativeVulnScanner.lastScan.viewRun', {
                  defaultMessage: 'View run',
                })}
              </EuiLink>
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {lastScan.feeds.length > 0 && (
        <>
          <EuiSpacer size="m" />
          <EuiBasicTable<SummaryFeed>
            tableCaption={i18n.translate('xpack.csp.nativeVulnScanner.lastScan.feedsCaption', {
              defaultMessage: 'Vulnerability feeds of the last scan',
            })}
            items={lastScan.feeds}
            columns={FEED_COLUMNS}
            rowProps={getFeedRowId}
            data-test-subj={SCANNER_SETTINGS_TEST_SUBJECTS.SCAN_FEEDS_TABLE}
          />
        </>
      )}
    </div>
  );
};

export const ScanSection = ({
  status,
  canEdit,
  awaitingScan,
  onScanStarted,
  onForbidden,
}: ScanSectionProps) => {
  const client = useNativeVulnScannerClient();
  const queryClient = useQueryClient();
  const { schedule, scanRunning, lastScan } = status;
  const isRunning = scanRunning || awaitingScan;

  const handleError = (error: unknown) => {
    if (getHttpErrorInfo(error).status === 403) onForbidden();
  };

  const scheduleMutation = useMutation((enabled: boolean) => client.setSchedule(enabled), {
    onSuccess: () => queryClient.invalidateQueries([NATIVE_VULN_SCANNER_STATUS_QUERY_KEY]),
    onError: handleError,
  });

  const scanMutation = useMutation(() => client.scanNow(), {
    onSuccess: () => {
      onScanStarted();
      return queryClient.invalidateQueries([NATIVE_VULN_SCANNER_STATUS_QUERY_KEY]);
    },
    onError: handleError,
  });

  return (
    <EuiPanel hasBorder paddingSize="l">
      <EuiTitle size="s">
        <h2>
          {i18n.translate('xpack.csp.nativeVulnScanner.scan.title', {
            defaultMessage: 'Scans',
          })}
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <LastScanPanel lastScan={lastScan} />
      <EuiSpacer size="l" />
      <EuiFlexGroup alignItems="center" gutterSize="l" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            label={i18n.translate('xpack.csp.nativeVulnScanner.scan.scheduleLabel', {
              defaultMessage: 'Run a scan every day',
            })}
            checked={schedule.enabled}
            disabled={!canEdit || !schedule.installed || scheduleMutation.isLoading}
            onChange={(event) => scheduleMutation.mutate(event.target.checked)}
            data-test-subj={SCANNER_SETTINGS_TEST_SUBJECTS.SCHEDULE_SWITCH}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            iconType="play"
            onClick={() => scanMutation.mutate()}
            isDisabled={!canEdit || isRunning}
            isLoading={scanMutation.isLoading}
            data-test-subj={SCANNER_SETTINGS_TEST_SUBJECTS.SCAN_NOW_BUTTON}
          >
            {i18n.translate('xpack.csp.nativeVulnScanner.scan.scanNow', {
              defaultMessage: 'Scan now',
            })}
          </EuiButton>
        </EuiFlexItem>
        {isRunning && (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              alignItems="center"
              gutterSize="s"
              responsive={false}
              data-test-subj={SCANNER_SETTINGS_TEST_SUBJECTS.SCAN_RUNNING}
            >
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="m" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  {i18n.translate('xpack.csp.nativeVulnScanner.scan.running', {
                    defaultMessage: 'A scan is running',
                  })}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {scheduleMutation.isError && (
        <>
          <EuiSpacer size="s" />
          <KbnDangerCallout
            announceOnMount
            size="s"
            title={i18n.translate('xpack.csp.nativeVulnScanner.scan.scheduleError', {
              defaultMessage: 'The schedule could not be changed',
            })}
            text={getHttpErrorInfo(scheduleMutation.error).message}
            data-test-subj={SCANNER_SETTINGS_TEST_SUBJECTS.SCHEDULE_ERROR}
          />
        </>
      )}
      {scanMutation.isError && (
        <>
          <EuiSpacer size="s" />
          <KbnDangerCallout
            announceOnMount
            size="s"
            title={getScanErrorText(getHttpErrorInfo(scanMutation.error))}
            data-test-subj={SCANNER_SETTINGS_TEST_SUBJECTS.SCAN_ERROR}
          />
        </>
      )}
      {scanMutation.isSuccess && !isRunning && (
        <>
          <EuiSpacer size="s" />
          <KbnSuccessCallout
            announceOnMount={false}
            size="s"
            title={i18n.translate('xpack.csp.nativeVulnScanner.scan.finished', {
              defaultMessage: 'The scan run has ended. The panel above shows the latest result.',
            })}
            data-test-subj={SCANNER_SETTINGS_TEST_SUBJECTS.SCAN_FINISHED}
          />
        </>
      )}
    </EuiPanel>
  );
};
