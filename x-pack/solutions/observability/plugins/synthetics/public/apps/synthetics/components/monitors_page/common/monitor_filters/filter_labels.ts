/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TYPE_LABEL = i18n.translate('xpack.synthetics.monitorManagement.filter.typeLabel', {
  defaultMessage: `Type`,
});

export const PROJECT_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.filter.projectLabel',
  {
    defaultMessage: `Project`,
  }
);

export const LOCATION_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.filter.locationLabel',
  {
    defaultMessage: `Location`,
  }
);

export const TAGS_LABEL = i18n.translate('xpack.synthetics.monitorManagement.filter.tagsLabel', {
  defaultMessage: `Tags`,
});

export const SCHEDULE_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.filter.frequencyLabel',
  {
    defaultMessage: `Frequency`,
  }
);

export const STATUS_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.filter.statusLabel',
  {
    defaultMessage: `Status`,
  }
);

export const STATUS_CODE_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.filter.statusCodeLabel',
  {
    defaultMessage: 'Status code',
  }
);

export const STATUS_UP_LABEL = i18n.translate('xpack.synthetics.overview.status.filters.up', {
  defaultMessage: 'Up',
});

export const STATUS_DOWN_LABEL = i18n.translate('xpack.synthetics.overview.status.filters.down', {
  defaultMessage: 'Down',
});

export const STATUS_DISABLED_LABEL = i18n.translate(
  'xpack.synthetics.overview.status.filters.disabled',
  {
    defaultMessage: 'Disabled',
  }
);

export const STATUS_PENDING_LABEL = i18n.translate(
  'xpack.synthetics.overview.status.filters.pending',
  {
    defaultMessage: 'Pending',
  }
);

export const STATUS_STALE_LABEL = i18n.translate('xpack.synthetics.overview.status.filters.stale', {
  defaultMessage: 'Stale',
});

const STATUS_FILTER_LABELS: Record<string, string> = {
  up: STATUS_UP_LABEL,
  down: STATUS_DOWN_LABEL,
  disabled: STATUS_DISABLED_LABEL,
  pending: STATUS_PENDING_LABEL,
  stale: STATUS_STALE_LABEL,
};

export const getStatusFilterLabel = (statusFilter: string): string =>
  STATUS_FILTER_LABELS[statusFilter] ??
  statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1);
