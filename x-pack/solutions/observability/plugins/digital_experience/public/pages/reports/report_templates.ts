/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ReportTemplateId } from '../../../common/types/applications';

/** The range the weekly scorecard opens at: the last seven days up to today, as a schedule has it. */
export const SCORECARD_TIME_RANGE = { rangeFrom: 'now-7d/d', rangeTo: 'now/d' } as const;

export interface ReportTemplate {
  id: ReportTemplateId;
  title: string;
  description: string;
  iconType: string;
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
    iconType: 'chartArea',
  },
];
