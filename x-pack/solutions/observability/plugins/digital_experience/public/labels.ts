/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ApplicationSource } from '../common/types/applications';

export const DIGITAL_EXPERIENCE_LABEL = i18n.translate('xpack.digitalExperience.label', {
  defaultMessage: 'Digital experience',
});

export const APPLICATIONS_LABEL = i18n.translate('xpack.digitalExperience.applications.label', {
  defaultMessage: 'Applications',
});

export const PAGE_LOADS_LABEL = i18n.translate('xpack.digitalExperience.pageLoads.label', {
  defaultMessage: 'Page loads',
});

export const LOAD_TIME_LABEL = i18n.translate('xpack.digitalExperience.loadTime.label', {
  defaultMessage: 'Load time (p75)',
});

export const SOURCE_LABELS: Record<ApplicationSource, string> = {
  otel: i18n.translate('xpack.digitalExperience.applications.source.otel', {
    defaultMessage: 'EDOT Browser',
  }),
  classic: i18n.translate('xpack.digitalExperience.applications.source.classic', {
    defaultMessage: 'Classic RUM',
  }),
};
