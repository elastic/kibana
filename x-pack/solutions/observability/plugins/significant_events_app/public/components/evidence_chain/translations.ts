/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
export const evidenceLabels = {
  title: i18n.translate('xpack.significantEventsApp.evidenceChain.title', {
    defaultMessage: 'Follow the evidence',
  }),
  hint: i18n.translate('xpack.significantEventsApp.evidenceChain.hint', {
    defaultMessage:
      'Select any step to inspect it. Solid lines trace stored references; dotted lines show service or impact context.',
  }),
  source: i18n.translate('xpack.significantEventsApp.evidenceChain.source', {
    defaultMessage: 'Source',
  }),
  service: i18n.translate('xpack.significantEventsApp.evidenceChain.service', {
    defaultMessage: 'Service',
  }),
  knowledge: i18n.translate('xpack.significantEventsApp.evidenceChain.knowledge', {
    defaultMessage: 'Knowledge',
  }),
  rule: i18n.translate('xpack.significantEventsApp.evidenceChain.rule', { defaultMessage: 'Rule' }),
  detection: i18n.translate('xpack.significantEventsApp.evidenceChain.detection', {
    defaultMessage: 'Detection',
  }),
  event: i18n.translate('xpack.significantEventsApp.evidenceChain.event', {
    defaultMessage: 'Significant event',
  }),
  all: i18n.translate('xpack.significantEventsApp.evidenceChain.expand', {
    defaultMessage: 'Expand all connections',
  }),
  fewer: i18n.translate('xpack.significantEventsApp.evidenceChain.collapse', {
    defaultMessage: 'Show fewer connections',
  }),
  unavailable: i18n.translate('xpack.significantEventsApp.evidenceChain.unavailable', {
    defaultMessage: 'Referenced record is unavailable in the loaded data.',
  }),
  error: i18n.translate('xpack.significantEventsApp.evidenceChain.error', {
    defaultMessage: 'Connections could not be loaded.',
  }),
  retry: i18n.translate('xpack.significantEventsApp.evidenceChain.retry', {
    defaultMessage: 'Retry',
  }),
  empty: i18n.translate('xpack.significantEventsApp.evidenceChain.empty', {
    defaultMessage: 'No linked record was found in the loaded time range.',
  }),
  latestVersion: i18n.translate('xpack.significantEventsApp.evidenceChain.latestVersion', {
    defaultMessage:
      'This rule references an earlier extraction run. The linked knowledge view shows the latest retained indicator.',
  }),
  more: (count: number): string =>
    i18n.translate('xpack.significantEventsApp.evidenceChain.more', {
      defaultMessage: '+{count} more',
      values: { count },
    }),
};
