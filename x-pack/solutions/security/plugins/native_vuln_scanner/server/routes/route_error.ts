/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, KibanaResponseFactory, Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { FleetUnauthorizedError } from '@kbn/fleet-plugin/server';
import { WorkflowNotFoundError } from '@kbn/workflows/common/errors';
import { ErrorCode } from '@kbn/cloud-security-posture-common/native_vuln_scanner/constants';

const statusCodeOf = (error: unknown): number | undefined =>
  typeof error === 'object' && error !== null && 'statusCode' in error
    ? Number((error as { statusCode: unknown }).statusCode)
    : undefined;

export const fleetUnavailable = (response: KibanaResponseFactory): IKibanaResponse =>
  response.customError({
    statusCode: 503,
    body: {
      message: i18n.translate('xpack.nativeVulnScanner.routes.fleetUnavailable', {
        defaultMessage: 'Fleet is not available.',
      }),
      attributes: { code: ErrorCode.FleetUnavailable },
    },
  });

/**
 * Maps the errors the onboarding routes can hit to a response. Workflows' access errors are not
 * exported, so a 403 is recognised by `statusCode`.
 */
export const respondWithError = (
  error: unknown,
  response: KibanaResponseFactory,
  logger: Logger
): IKibanaResponse => {
  const message = error instanceof Error ? error.message : String(error);
  if (error instanceof FleetUnauthorizedError || statusCodeOf(error) === 403) {
    return response.forbidden({ body: { message } });
  }
  if (error instanceof WorkflowNotFoundError) {
    return response.notFound({
      body: { message, attributes: { code: ErrorCode.WorkflowNotInstalled } },
    });
  }
  logger.error(`Native vulnerability scanner request failed: ${message}`);
  return response.customError({ statusCode: 500, body: { message } });
};
