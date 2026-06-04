/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ADDED_TIMELINE_LABEL = i18n.translate(
  'xpack.securitySolution.cases.timelineAttachment.addedLabel',
  {
    defaultMessage: 'added timeline',
  }
);

export const REMOVED_TIMELINE_LABEL = i18n.translate(
  'xpack.securitySolution.cases.timelineAttachment.removedLabel',
  {
    defaultMessage: 'removed timeline',
  }
);

export const DELETE_TIMELINE_SUCCESS_TITLE = i18n.translate(
  'xpack.securitySolution.cases.timelineAttachment.deleteSuccessTitle',
  {
    defaultMessage: 'Deleted timeline attachment',
  }
);

export const TIMELINE_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.cases.timelineAttachment.errorTitle',
  {
    defaultMessage: 'Timeline Error',
  }
);

export const FAILED_TO_RETRIEVE_TIMELINE = (timelineId: string) =>
  i18n.translate('xpack.securitySolution.cases.timelineAttachment.failedRetrieveError', {
    defaultMessage: 'Failed to retrieve Timeline id: {timelineId}',
    values: { timelineId },
  });

export const TIMELINE_AVATAR_ARIA = i18n.translate(
  'xpack.securitySolution.cases.timelineAttachment.avatarAriaLabel',
  {
    defaultMessage: 'timeline',
  }
);

export const TIMELINE_DISPLAY_NAME = i18n.translate(
  'xpack.securitySolution.cases.timelineAttachment.displayName',
  {
    defaultMessage: 'Timeline',
  }
);

export const SELECT_TIMELINE_MODAL_TITLE = i18n.translate(
  'xpack.securitySolution.cases.timelineAttachment.modalTitle',
  {
    defaultMessage: 'Select a timeline',
  }
);

export const NO_TIMELINES_ATTACHED = i18n.translate(
  'xpack.securitySolution.cases.timelineAttachment.tab.empty',
  {
    defaultMessage: 'No timelines have been attached to this case yet.',
  }
);
