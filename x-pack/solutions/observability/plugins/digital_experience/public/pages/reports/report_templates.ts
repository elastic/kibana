/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export type ReportTemplateId = 'scorecard';

export interface ReportTemplate {
  id: ReportTemplateId;
  title: string;
  description: string;
  iconType: string;
  /** Templates that are listed but can't be opened yet. */
  isAvailable: boolean;
}

/** The reports an application can have, in display order; fixed in code. */
export const REPORT_TEMPLATES: readonly ReportTemplate[] = [
  {
    id: 'scorecard',
    title: i18n.translate('xpack.digitalExperience.reports.scorecard.title', {
      defaultMessage: 'Weekly scorecard',
    }),
    description: i18n.translate('xpack.digitalExperience.reports.scorecard.description', {
      defaultMessage:
        'Page loads, load time, errors and Core Web Vitals, each compared with the previous period.',
    }),
    iconType: 'visArea',
    isAvailable: false,
  },
];
