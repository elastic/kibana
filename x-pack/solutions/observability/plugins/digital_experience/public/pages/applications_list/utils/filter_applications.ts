/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  APPLICATION_PLATFORM,
  APPLICATION_SOURCE,
  isMobilePlatform,
} from '../../../../common/application_source';
import type {
  ApplicationSource,
  ApplicationSummary,
  MobileApplicationSummary,
  MobilePlatform,
  WebApplicationSummary,
} from '../../../../common/types/applications';

/** A list row: an application, flagged when its name also has Classic RUM data. */
export type ApplicationRow = WebApplicationSummary & { hasClassicData: boolean };

/** Whether an application runs in a browser: an EDOT Browser or Classic RUM one. */
export const isWebApplication = (app: ApplicationSummary): app is WebApplicationSummary =>
  app.platform === APPLICATION_PLATFORM.browser;

/**
 * The mobile applications of `applications`, of `platform` or of both, whose name contains
 * `search`; they have their own table and columns.
 */
export const mobileApplicationsMatching = ({
  applications,
  search,
  platform,
}: {
  applications: ApplicationSummary[];
  search: string;
  platform?: MobilePlatform;
}): MobileApplicationSummary[] => {
  const term = search.trim().toLowerCase();
  return applications.filter(
    (app): app is MobileApplicationSummary =>
      isMobilePlatform(app.platform) &&
      (!platform || app.platform === platform) &&
      (!term || app.serviceName.toLowerCase().includes(term))
  );
};

interface ApplicationFilters {
  applications: ApplicationSummary[];
  /** `undefined` for all sources. */
  source: ApplicationSource | undefined;
  search: string;
}

/** The applications of `source` whose name contains `search`, ignoring case; one per source. */
export const applicationsMatching = ({
  applications,
  source,
  search,
}: ApplicationFilters): ApplicationSummary[] => {
  const term = search.trim().toLowerCase();
  return applications
    .filter((app) => !source || app.source === source)
    .filter(({ serviceName }) => !term || serviceName.toLowerCase().includes(term));
};

/**
 * The web rows to show: `applicationsMatching`, but with all sources a name with both an EDOT
 * Browser and a Classic RUM row shows only the EDOT Browser one, flagged with `hasClassicData`.
 */
export const filterApplications = (filters: ApplicationFilters): ApplicationRow[] => {
  const { source } = filters;
  // Mobile applications are EDOT data too, but have their own table.
  const applications = filters.applications.filter(isWebApplication);
  const namesOf = (appSource: ApplicationSource) =>
    new Set(
      applications.filter((app) => app.source === appSource).map(({ serviceName }) => serviceName)
    );
  const otelNames = namesOf(APPLICATION_SOURCE.otel);
  const classicNames = namesOf(APPLICATION_SOURCE.classic);

  return applicationsMatching({ ...filters, applications })
    .filter(isWebApplication)
    .filter(
      (app) =>
        source !== undefined ||
        app.source === APPLICATION_SOURCE.otel ||
        !otelNames.has(app.serviceName)
    )
    .map((app) => ({
      ...app,
      hasClassicData:
        !source && app.source === APPLICATION_SOURCE.otel && classicNames.has(app.serviceName),
    }));
};
