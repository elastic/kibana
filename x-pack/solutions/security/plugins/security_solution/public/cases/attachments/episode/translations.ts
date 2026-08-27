/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const EPISODE_DISPLAY_NAME = i18n.translate(
  'xpack.securitySolution.cases.episodeAttachment.displayName',
  { defaultMessage: 'Alert episode' }
);

export const ADDED_EPISODE_LABEL = i18n.translate(
  'xpack.securitySolution.cases.episodeAttachment.addedLabel',
  { defaultMessage: 'attached alert episode' }
);

export const REMOVED_EPISODE_LABEL = i18n.translate(
  'xpack.securitySolution.cases.episodeAttachment.removedLabel',
  { defaultMessage: 'removed alert episode' }
);

export const DELETE_EPISODE_SUCCESS_TOAST = i18n.translate(
  'xpack.securitySolution.cases.episodeAttachment.deleteSuccessToast',
  { defaultMessage: 'Alert episode attachment removed' }
);

export const NO_EPISODES_ATTACHED = i18n.translate(
  'xpack.securitySolution.cases.episodeAttachment.noEpisodes',
  { defaultMessage: 'No alert episodes have been attached to this case.' }
);

export const COLUMN_RULE = i18n.translate(
  'xpack.securitySolution.cases.episodeAttachment.columns.rule',
  { defaultMessage: 'Rule' }
);
export const COLUMN_STATUS = i18n.translate(
  'xpack.securitySolution.cases.episodeAttachment.columns.status',
  { defaultMessage: 'Status' }
);
export const COLUMN_SEVERITY = i18n.translate(
  'xpack.securitySolution.cases.episodeAttachment.columns.severity',
  { defaultMessage: 'Severity' }
);
export const COLUMN_TRIGGERED = i18n.translate(
  'xpack.securitySolution.cases.episodeAttachment.columns.triggered',
  { defaultMessage: 'Triggered' }
);
