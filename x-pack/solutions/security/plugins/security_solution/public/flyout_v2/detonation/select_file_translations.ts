/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

const t = (key: string, defaultMessage: string) =>
  i18n.translate(`xpack.securitySolution.flyoutV2.detonation.selectFile.${key}`, {
    defaultMessage,
  });

export const PANEL_TITLE = t('title', 'Select a file to detonate');
export const SEARCH_PLACEHOLDER = t('searchPlaceholder', 'Select a file');
export const CONTINUE = t('continue', 'Continue');
export const NO_FILES = t('noFiles', 'No files match');
export const BADGE_DETONATED = t('badgeDetonated', 'Detonated: Malicious');
