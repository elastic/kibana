/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const COLUMN_JOB_NAME = i18n.translate(
  'xpack.securitySolution.components.mlPopup.jobsTable.jobNameColumn',
  {
    defaultMessage: 'Job name',
  }
);

export const COLUMN_GROUPS = i18n.translate(
  'xpack.securitySolution.components.mlPopup.jobsTable.tagsColumn',
  {
    defaultMessage: 'Groups',
  }
);

export const COLUMN_RUN_JOB = i18n.translate(
  'xpack.securitySolution.components.mlPopup.jobsTable.runJobColumn',
  {
    defaultMessage: 'Run job',
  }
);

export const NO_ITEMS_TEXT = i18n.translate(
  'xpack.securitySolution.components.mlPopup.jobsTable.noItemsDescription',
  {
    defaultMessage: 'No Security Machine Learning jobs found',
  }
);

export const CREATE_CUSTOM_JOB = i18n.translate(
  'xpack.securitySolution.components.mlPopup.jobsTable.createCustomJobButtonLabel',
  {
    defaultMessage: 'Create custom job',
  }
);

export const NO_INTEGRATION_JOBS_TEXT = i18n.translate(
  'xpack.securitySolution.components.mlPopup.jobsTable.noIntegrationJobsDescription',
  {
    defaultMessage:
      'No integration ML jobs found. Install Security integrations that ship anomaly detection jobs, then enable them here.',
  }
);

export const BROWSE_INTEGRATIONS = i18n.translate(
  'xpack.securitySolution.components.mlPopup.jobsTable.browseIntegrationsButtonLabel',
  {
    defaultMessage: 'Browse integrations',
  }
);

export const JOBS_TABLE_CAPTION = i18n.translate(
  'xpack.securitySolution.components.mlPopup.jobsTable.caption',
  {
    defaultMessage: 'ML jobs',
  }
);

export const UPDATE_AVAILABLE_BADGE = i18n.translate(
  'xpack.securitySolution.components.mlPopup.jobsTable.updateAvailableBadge',
  {
    defaultMessage: 'Update available',
  }
);

export const BACK_TO_INTEGRATION_PACKAGES = i18n.translate(
  'xpack.securitySolution.components.mlPopup.jobsTable.backToIntegrationPackagesButtonLabel',
  {
    defaultMessage: 'Back to integration packages',
  }
);

export const SEARCH_INTEGRATION_PACKAGES_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.components.mlPopup.jobsTable.searchIntegrationPackagesPlaceholder',
  {
    defaultMessage: 'Search integration packages',
  }
);

export const NO_MATCHING_INTEGRATION_PACKAGES = i18n.translate(
  'xpack.securitySolution.components.mlPopup.jobsTable.noMatchingIntegrationPackagesDescription',
  {
    defaultMessage: 'No integration packages match your search',
  }
);

export const INTEGRATION_PACKAGE_JOB_COUNT = (count: number) =>
  i18n.translate('xpack.securitySolution.components.mlPopup.jobsTable.integrationPackageJobCount', {
    values: { count },
    defaultMessage: '{count} {count, plural, one {job} other {jobs}}',
  });

export const INTEGRATION_PACKAGE_INSTALLED_COUNT = (count: number) =>
  i18n.translate(
    'xpack.securitySolution.components.mlPopup.jobsTable.integrationPackageInstalledCount',
    {
      values: { count },
      defaultMessage: '{count} installed',
    }
  );

export const INTEGRATION_PACKAGE_UPDATES_COUNT = (count: number) =>
  i18n.translate(
    'xpack.securitySolution.components.mlPopup.jobsTable.integrationPackageUpdatesCount',
    {
      values: { count },
      defaultMessage: '{count} {count, plural, one {update} other {updates}} available',
    }
  );
