/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationSource, ApplicationSummary } from '../../../../common/types/applications';

export * as testData from './constants';

/** The row of one application and source, so assertions ignore data other suites may add. */
export const findApplication = (
  applications: ApplicationSummary[],
  serviceName: string,
  source: ApplicationSource
): ApplicationSummary | undefined =>
  applications.find(
    (application) => application.serviceName === serviceName && application.source === source
  );
