/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { toWorkflowExecutionEngineModel } from '@kbn/workflows';
import { WorkflowDisabledError, WorkflowInvalidError } from '@kbn/workflows/common/errors';
import { NATIVE_VULN_SCANNER_SCAN_WORKFLOW_ID } from '@kbn/workflows/managed';
import { validateWorkflowForExecution } from '@kbn/workflows/server';
import {
  ErrorCode,
  FLEET_AGENT_POLICIES_ALL_PRIVILEGE,
  NATIVE_VULN_SCANNER_API_VERSION,
  SCAN_PATH,
} from '@kbn/cloud-security-posture-common/native_vuln_scanner/constants';
import { isScanRunning } from '../lib/onboarding';
import { respondWithError } from './route_error';
import type { RouteDependencies } from './types';
import { withLicense } from './with_license';

/**
 * Starts a scan now. `runWorkflow` itself does not check `enabled` (the engine does, later and
 * asynchronously), so the route validates first and never enables the workflow on the caller's behalf.
 */
export const registerScanRoute = ({
  router,
  logger,
  getLicense,
  getServices,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: SCAN_PATH,
      access: 'internal',
      security: { authz: { requiredPrivileges: [FLEET_AGENT_POLICIES_ALL_PRIVILEGE] } },
      summary: i18n.translate('xpack.nativeVulnScanner.routes.scanSummary', {
        defaultMessage: 'Run a native vulnerability scan now',
      }),
    })
    .addVersion(
      { version: NATIVE_VULN_SCANNER_API_VERSION, validate: false },
      withLicense(getLicense, async (_context, request, response) => {
        try {
          const { workflows } = await getServices();
          const workflow = await workflows.getWorkflow(
            NATIVE_VULN_SCANNER_SCAN_WORKFLOW_ID,
            DEFAULT_SPACE_ID,
            request
          );
          validateWorkflowForExecution(workflow, NATIVE_VULN_SCANNER_SCAN_WORKFLOW_ID);
          if (await isScanRunning({ workflows, request })) {
            return response.conflict({
              body: {
                message: i18n.translate('xpack.nativeVulnScanner.routes.scanInProgress', {
                  defaultMessage: 'A vulnerability scan is already running.',
                }),
                attributes: { code: ErrorCode.ScanInProgress },
              },
            });
          }
          const executionId = await workflows.runWorkflow(
            toWorkflowExecutionEngineModel(workflow),
            DEFAULT_SPACE_ID,
            {},
            request
          );
          // The returned executionId can still end up SKIPPED: the workflow runs with `drop`
          // concurrency, so a scan started while another is running is dropped. The UI should
          // poll the execution rather than assume it ran.
          return response.ok({ body: { executionId } });
        } catch (error) {
          if (error instanceof WorkflowDisabledError) {
            return response.conflict({
              body: {
                message: i18n.translate('xpack.nativeVulnScanner.routes.scheduleDisabled', {
                  defaultMessage: 'Enable the scan schedule before running a scan.',
                }),
                attributes: { code: ErrorCode.ScheduleDisabled },
              },
            });
          }
          if (error instanceof WorkflowInvalidError) {
            return response.customError({
              statusCode: 500,
              body: { message: error.message, attributes: { code: ErrorCode.WorkflowInvalid } },
            });
          }
          return respondWithError(error, response, logger);
        }
      })
    );
};
