/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/** What a single LCP / INP / CLS / FCP / TTFB sample means (session, not p75). */
export const VITAL_HELP = {
  lcp: i18n.translate('xpack.ux.vitals.lcpHelpTooltip', {
    defaultMessage:
      'Largest Contentful Paint: time until the largest visible element renders. Good ≤ 2.5s, needs improvement ≤ 4s, poor > 4s.',
  }),
  inp: i18n.translate('xpack.ux.vitals.inpHelpTooltip', {
    defaultMessage:
      'Interaction to Next Paint: how long the page takes to respond to clicks, taps, and keys. Good ≤ 200ms, needs improvement ≤ 500ms, poor > 500ms.',
  }),
  cls: i18n.translate('xpack.ux.vitals.clsHelpTooltip', {
    defaultMessage:
      'Cumulative Layout Shift: how much the page layout jumps while loading. Good ≤ 0.1, needs improvement ≤ 0.25, poor > 0.25.',
  }),
  fcp: i18n.translate('xpack.ux.vitals.fcpHelpTooltip', {
    defaultMessage:
      'First Contentful Paint: time until the first text or image appears. Good ≤ 1.8s, needs improvement ≤ 3s, poor > 3s.',
  }),
  ttfb: i18n.translate('xpack.ux.vitals.ttfbHelpTooltip', {
    defaultMessage:
      'Time to First Byte: time until the browser receives the first byte from the server. Good ≤ 800ms, needs improvement ≤ 1.8s, poor > 1.8s.',
  }),
} as const;

/** Aggregate columns and KPIs: same meaning, values are the 75th percentile. */
export const VITAL_P75_HELP = {
  lcp: i18n.translate('xpack.ux.vitals.lcpP75HelpTooltip', {
    defaultMessage:
      'Largest Contentful Paint at the 75th percentile: time until the largest visible element rendered. 75% of views were this fast or faster. Good ≤ 2.5s, needs improvement ≤ 4s, poor > 4s.',
  }),
  inp: i18n.translate('xpack.ux.vitals.inpP75HelpTooltip', {
    defaultMessage:
      'Interaction to Next Paint at the 75th percentile: how long the page took to respond to clicks, taps, and keys. 75% of views were this fast or faster. Good ≤ 200ms, needs improvement ≤ 500ms, poor > 500ms.',
  }),
  cls: i18n.translate('xpack.ux.vitals.clsP75HelpTooltip', {
    defaultMessage:
      'Cumulative Layout Shift at the 75th percentile: how much the page layout jumped while loading. 75% of views were this stable or better. Good ≤ 0.1, needs improvement ≤ 0.25, poor > 0.25.',
  }),
  fcp: i18n.translate('xpack.ux.vitals.fcpP75HelpTooltip', {
    defaultMessage:
      'First Contentful Paint at the 75th percentile: time until the first text or image appeared. 75% of views were this fast or faster. Good ≤ 1.8s, needs improvement ≤ 3s, poor > 3s.',
  }),
  ttfb: i18n.translate('xpack.ux.vitals.ttfbP75HelpTooltip', {
    defaultMessage:
      'Time to First Byte at the 75th percentile: time until the browser received the first byte. 75% of views were this fast or faster. Good ≤ 800ms, needs improvement ≤ 1.8s, poor > 1.8s.',
  }),
  load: i18n.translate('xpack.ux.vitals.loadP75HelpTooltip', {
    defaultMessage:
      'Document load duration at the 75th percentile. 75% of page views finished loading at least this quickly.',
  }),
} as const;

export const AVG_LOAD_HELP = i18n.translate('xpack.ux.vitals.avgLoadHelpTooltip', {
  defaultMessage: 'Average time for the document to finish loading on this page.',
});

export const PASSING_CWV_HELP = i18n.translate('xpack.ux.vitals.passingCwvHelpTooltip', {
  defaultMessage:
    'Share of page views whose LCP, INP, and CLS are all in the good range (LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1).',
});

export const POOR_LCP_HELP = i18n.translate('xpack.ux.vitals.poorLcpHelpTooltip', {
  defaultMessage:
    'Pages whose 75th-percentile Largest Contentful Paint is slower than 4 seconds (poor).',
});
