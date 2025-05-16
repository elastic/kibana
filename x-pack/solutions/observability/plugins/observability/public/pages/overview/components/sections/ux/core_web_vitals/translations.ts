/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const NO_DATA = i18n.translate('xpack.observability.ux.coreVitals.noData', {
  defaultMessage: 'No data is available.',
});

export const LCP_LABEL = i18n.translate('xpack.observability.ux.coreVitals.lcp', {
  defaultMessage: 'Largest contentful paint',
});

export const INP_LABEL = i18n.translate('xpack.observability.ux.coreVitals.inp', {
  defaultMessage: 'Interaction to next paint',
});

export const CLS_LABEL = i18n.translate('xpack.observability.ux.coreVitals.cls', {
  defaultMessage: 'Cumulative layout shift',
});

export const CV_POOR_LABEL = i18n.translate('xpack.observability.ux.coreVitals.poor', {
  defaultMessage: 'a poor',
});

export const CV_GOOD_LABEL = i18n.translate('xpack.observability.ux.coreVitals.good', {
  defaultMessage: 'a good',
});

export const CV_AVERAGE_LABEL = i18n.translate('xpack.observability.ux.coreVitals.average', {
  defaultMessage: 'an average',
});

export const LEGEND_POOR_LABEL = i18n.translate('xpack.observability.ux.coreVitals.legends.poor', {
  defaultMessage: 'Poor',
});

export const LEGEND_GOOD_LABEL = i18n.translate('xpack.observability.ux.coreVitals.legends.good', {
  defaultMessage: 'Good',
});

export const LEGEND_NEEDS_IMPROVEMENT_LABEL = i18n.translate(
  'xpack.observability.ux.coreVitals.legends.needsImprovement',
  {
    defaultMessage: 'Needs improvement',
  }
);

export const MORE_LABEL = i18n.translate('xpack.observability.ux.coreVitals.more', {
  defaultMessage: 'more',
});

export const LESS_LABEL = i18n.translate('xpack.observability.ux.coreVitals.less', {
  defaultMessage: 'less',
});

export const IS_LABEL = i18n.translate('xpack.observability.ux.coreVitals.is', {
  defaultMessage: 'is',
});

export const TAKES_LABEL = i18n.translate('xpack.observability.ux.coreVitals.takes', {
  defaultMessage: 'takes',
});

export const LCP_HELP_LABEL = i18n.translate('xpack.observability.ux.coreVitals.lcp.help', {
  defaultMessage:
    'Largest contentful paint measures loading performance. To provide a good user experience, LCP should occur within 2.5 seconds of when the page first starts loading.',
});

export const INP_HELP_LABEL = i18n.translate('xpack.observability.ux.coreVitals.inp.help', {
  defaultMessage:
    'INP assesses responsiveness using data from the Event Timing API. When an interaction causes a page to become unresponsive, that is a poor user experience. INP observes the latency of all interactions a user has made with the page, and reports a single value which all (or nearly all) interactions were below. A low INP means the page was consistently able to respond quickly to all—or the vast majority—of user interactions.',
});

export const CLS_HELP_LABEL = i18n.translate('xpack.observability.ux.coreVitals.cls.help', {
  defaultMessage:
    'Cumulative Layout Shift (CLS): measures visual stability. To provide a good user experience, pages should maintain a CLS of less than 0.1.',
});
