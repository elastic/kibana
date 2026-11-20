/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ApplicationSummary,
  MobileApplicationSummary,
  WebApplicationSource,
  WebApplicationSummary,
} from '../../../../common/types/applications';

export * as testData from './constants';

/** The row of one application and source, so assertions ignore data other suites may add. */
export function findApplication(
  applications: ApplicationSummary[],
  serviceName: string,
  source: WebApplicationSource
): WebApplicationSummary | undefined;
export function findApplication(
  applications: ApplicationSummary[],
  serviceName: string,
  source: 'mobile'
): MobileApplicationSummary | undefined;
export function findApplication(
  applications: ApplicationSummary[],
  serviceName: string,
  source: ApplicationSummary['source']
): ApplicationSummary | undefined {
  return applications.find(
    (application) => application.serviceName === serviceName && application.source === source
  );
}
