/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const DETECTION_TAB_IDS = ['events'] as const;

export type DetectionTabId = (typeof DETECTION_TAB_IDS)[number];

export const DETECTION_TAB_LABELS: Record<DetectionTabId, string> = {
  events: i18n.translate('xpack.nightshift.detectionPage.tabs.events', {
    defaultMessage: 'Events',
  }),
};

export const isDetectionTabId = (value: string): value is DetectionTabId =>
  DETECTION_TAB_IDS.includes(value as DetectionTabId);
