/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ApplicationSource,
  ApplicationSummary,
  MobileApplicationSummary,
  MobilePlatform,
  WebApplicationSummary,
} from '../../../../common/types/applications';

export * as testData from './constants';

/**
 * The browser row of one application and source, so assertions ignore data other suites may add.
 */
export const findApplication = (
  applications: ApplicationSummary[],
  serviceName: string,
  source: ApplicationSource
): WebApplicationSummary | undefined =>
  applications.find(
    (application): application is WebApplicationSummary =>
      application.platform === 'browser' &&
      application.serviceName === serviceName &&
      application.source === source
  );

/** The row of one mobile application on one platform. */
export const findMobileApplication = (
  applications: ApplicationSummary[],
  serviceName: string,
  platform: MobilePlatform
): MobileApplicationSummary | undefined =>
  applications.find(
    (application): application is MobileApplicationSummary =>
      application.platform === platform && application.serviceName === serviceName
  );
