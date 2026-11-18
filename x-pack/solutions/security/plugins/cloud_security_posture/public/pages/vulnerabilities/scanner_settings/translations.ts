/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  PackAction,
  PackDifference,
  PolicyOnboardingState,
  PolicyRefusalReason,
  RuntimePinOutcome,
  SummaryFeedStatus,
  SummaryRunStatus,
} from '@kbn/cloud-security-posture-common/native_vuln_scanner/types';
import { ErrorCode } from '@kbn/cloud-security-posture-common/native_vuln_scanner/constants';
import type { LiveQueryResult } from './apply_onboarding';
import type { HttpErrorInfo } from './http_error';

export const getRefusalText = (reason: PolicyRefusalReason | undefined, key?: string): string => {
  switch (reason) {
    case 'managed':
      return i18n.translate('xpack.csp.nativeVulnScanner.refusal.managed', {
        defaultMessage: 'This policy is managed by Fleet and cannot be edited.',
      });
    case 'agentless':
      return i18n.translate('xpack.csp.nativeVulnScanner.refusal.agentless', {
        defaultMessage: 'Agentless policies cannot run osquery, so they are not supported.',
      });
    case 'no_osquery_integration':
      return i18n.translate('xpack.csp.nativeVulnScanner.refusal.noOsqueryIntegration', {
        defaultMessage: 'This policy has no Osquery Manager integration. Add it first.',
      });
    case 'invalid_agent_internal':
      return i18n.translate('xpack.csp.nativeVulnScanner.refusal.invalidAgentInternal', {
        defaultMessage:
          'The policy’s advanced settings (agent_internal) contain a value for "{key}" that cannot be edited automatically.',
        values: { key: key ?? 'agent_internal' },
      });
    case 'not_found':
      return i18n.translate('xpack.csp.nativeVulnScanner.refusal.notFound', {
        defaultMessage: 'This policy no longer exists.',
      });
    default:
      return i18n.translate('xpack.csp.nativeVulnScanner.refusal.unknown', {
        defaultMessage: 'This policy cannot be changed.',
      });
  }
};

export const getPackActionText = (action: PackAction): string => {
  switch (action) {
    case 'create':
      return i18n.translate('xpack.csp.nativeVulnScanner.packAction.create', {
        defaultMessage:
          'Create the software inventory pack and assign it to the selected policies.',
      });
    case 'add_policies':
      return i18n.translate('xpack.csp.nativeVulnScanner.packAction.addPolicies', {
        defaultMessage: 'Assign the existing software inventory pack to the selected policies.',
      });
    case 'repair_queries':
      return i18n.translate('xpack.csp.nativeVulnScanner.packAction.repairQueries', {
        defaultMessage: 'Restore the software inventory pack to its expected queries and schedule.',
      });
    case 'repair_queries_and_add_policies':
      return i18n.translate('xpack.csp.nativeVulnScanner.packAction.repairQueriesAndAddPolicies', {
        defaultMessage:
          'Restore the software inventory pack to its expected queries and schedule, and assign it to the selected policies.',
      });
    case 'no_change':
    default:
      return i18n.translate('xpack.csp.nativeVulnScanner.packAction.noChange', {
        defaultMessage: 'The software inventory pack is already set up. No pack change is needed.',
      });
  }
};

export const getPackDifferenceText = ({ code, queryId }: PackDifference): string => {
  const query = queryId ?? '';
  switch (code) {
    case 'pack_disabled':
      return i18n.translate('xpack.csp.nativeVulnScanner.packDifference.packDisabled', {
        defaultMessage: 'The pack is disabled.',
      });
    case 'schedule_type_differs':
      return i18n.translate('xpack.csp.nativeVulnScanner.packDifference.scheduleTypeDiffers', {
        defaultMessage: 'The pack does not use a fixed interval schedule.',
      });
    case 'interval_differs':
      return i18n.translate('xpack.csp.nativeVulnScanner.packDifference.intervalDiffers', {
        defaultMessage: 'The pack does not run once a day.',
      });
    case 'query_missing':
      return i18n.translate('xpack.csp.nativeVulnScanner.packDifference.queryMissing', {
        defaultMessage: 'The query "{query}" is missing from the pack.',
        values: { query },
      });
    case 'query_sql_differs':
      return i18n.translate('xpack.csp.nativeVulnScanner.packDifference.querySqlDiffers', {
        defaultMessage: 'The SQL of the query "{query}" was changed.',
        values: { query },
      });
    case 'query_platform_differs':
      return i18n.translate('xpack.csp.nativeVulnScanner.packDifference.queryPlatformDiffers', {
        defaultMessage: 'The platform of the query "{query}" was changed.',
        values: { query },
      });
    case 'query_not_snapshot':
      return i18n.translate('xpack.csp.nativeVulnScanner.packDifference.queryNotSnapshot', {
        defaultMessage: 'The query "{query}" does not run in snapshot mode.',
        values: { query },
      });
    case 'query_disabled':
      return i18n.translate('xpack.csp.nativeVulnScanner.packDifference.queryDisabled', {
        defaultMessage: 'The query "{query}" is disabled.',
        values: { query },
      });
    default:
      return code;
  }
};

export const getStateLabel = (state: PolicyOnboardingState): string => {
  switch (state) {
    case 'not_configured':
      return i18n.translate('xpack.csp.nativeVulnScanner.state.notConfigured', {
        defaultMessage: 'Not configured',
      });
    case 'pending_inventory':
      return i18n.translate('xpack.csp.nativeVulnScanner.state.pendingInventory', {
        defaultMessage: 'Waiting for first inventory',
      });
    case 'reporting':
      return i18n.translate('xpack.csp.nativeVulnScanner.state.reporting', {
        defaultMessage: 'Reporting',
      });
    case 'scanned':
    default:
      return i18n.translate('xpack.csp.nativeVulnScanner.state.scanned', {
        defaultMessage: 'Scanned',
      });
  }
};

export const getPinOutcomeLabel = (outcome: RuntimePinOutcome): string => {
  switch (outcome) {
    case 'updated':
      return i18n.translate('xpack.csp.nativeVulnScanner.pinOutcome.updated', {
        defaultMessage: 'Runtime pinned',
      });
    case 'no_change':
      return i18n.translate('xpack.csp.nativeVulnScanner.pinOutcome.noChange', {
        defaultMessage: 'Already pinned',
      });
    case 'refused':
      return i18n.translate('xpack.csp.nativeVulnScanner.pinOutcome.refused', {
        defaultMessage: 'Not changed',
      });
    case 'not_found':
      return i18n.translate('xpack.csp.nativeVulnScanner.pinOutcome.notFound', {
        defaultMessage: 'Not found',
      });
    case 'failed':
    default:
      return i18n.translate('xpack.csp.nativeVulnScanner.pinOutcome.failed', {
        defaultMessage: 'Failed',
      });
  }
};

export const getFeedStatusLabel = (status: SummaryFeedStatus): string => {
  switch (status) {
    case 'matched':
      return i18n.translate('xpack.csp.nativeVulnScanner.feedStatus.matched', {
        defaultMessage: 'Matched',
      });
    case 'unavailable':
      return i18n.translate('xpack.csp.nativeVulnScanner.feedStatus.unavailable', {
        defaultMessage: 'No feed',
      });
    case 'failed':
    default:
      return i18n.translate('xpack.csp.nativeVulnScanner.feedStatus.failed', {
        defaultMessage: 'Failed',
      });
  }
};

export const getRunStatusLabel = (status: SummaryRunStatus): string => {
  switch (status) {
    case 'success':
      return i18n.translate('xpack.csp.nativeVulnScanner.runStatus.success', {
        defaultMessage: 'Succeeded',
      });
    case 'partial':
      return i18n.translate('xpack.csp.nativeVulnScanner.runStatus.partial', {
        defaultMessage: 'Partially succeeded',
      });
    case 'failed':
      return i18n.translate('xpack.csp.nativeVulnScanner.runStatus.failed', {
        defaultMessage: 'Failed',
      });
    case 'aborted':
      return i18n.translate('xpack.csp.nativeVulnScanner.runStatus.aborted', {
        defaultMessage: 'Aborted',
      });
    case 'no_pack':
    default:
      return i18n.translate('xpack.csp.nativeVulnScanner.runStatus.noPack', {
        defaultMessage: 'No inventory yet',
      });
  }
};

/** The scan route's error codes, translated; unknown errors fall back to the server message. */
export const getScanErrorText = ({ code, message }: HttpErrorInfo): string => {
  switch (code) {
    case ErrorCode.ScheduleDisabled:
      return i18n.translate('xpack.csp.nativeVulnScanner.scanError.scheduleDisabled', {
        defaultMessage: 'The scan schedule is turned off. Turn it on, then scan again.',
      });
    case ErrorCode.ScanInProgress:
      return i18n.translate('xpack.csp.nativeVulnScanner.scanError.scanInProgress', {
        defaultMessage: 'A scan is already running. Wait for it to finish.',
      });
    case ErrorCode.WorkflowNotInstalled:
      return i18n.translate('xpack.csp.nativeVulnScanner.scanError.workflowNotInstalled', {
        defaultMessage: 'The scan workflow is not installed yet.',
      });
    case ErrorCode.WorkflowInvalid:
      return i18n.translate('xpack.csp.nativeVulnScanner.scanError.workflowInvalid', {
        defaultMessage: 'The scan workflow is invalid and cannot run.',
      });
    case ErrorCode.LicenseRequired:
      return i18n.translate('xpack.csp.nativeVulnScanner.scanError.licenseRequired', {
        defaultMessage: 'Native vulnerability scanning requires an Enterprise license.',
      });
    default:
      return (
        message ??
        i18n.translate('xpack.csp.nativeVulnScanner.scanError.unknown', {
          defaultMessage: 'The scan could not be started.',
        })
      );
  }
};

/** The result of a single "Collect inventory now" request, translated. */
export const getCollectInventoryText = ({ status, message }: LiveQueryResult): string => {
  switch (status) {
    case 'started':
      return i18n.translate('xpack.csp.nativeVulnScanner.collectInventory.started', {
        defaultMessage: 'The inventory was requested. It can take a few minutes to show up.',
      });
    case 'no_agents':
      return i18n.translate('xpack.csp.nativeVulnScanner.collectInventory.noAgents', {
        defaultMessage: 'No online agents in this policy. The daily pack will pick them up.',
      });
    case 'skipped':
      return i18n.translate('xpack.csp.nativeVulnScanner.collectInventory.skipped', {
        defaultMessage:
          'The inventory could not be requested now. It arrives with the daily schedule.',
      });
    default:
      return i18n.translate('xpack.csp.nativeVulnScanner.collectInventory.failed', {
        defaultMessage:
          'The inventory request failed: {message}. It arrives with the daily schedule.',
        values: {
          message:
            message ??
            i18n.translate('xpack.csp.nativeVulnScanner.collectInventory.unknownError', {
              defaultMessage: 'unknown error',
            }),
        },
      });
  }
};
