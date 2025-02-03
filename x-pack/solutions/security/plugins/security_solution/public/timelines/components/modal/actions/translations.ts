/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { type TimelineType, TimelineTypeEnum } from '../../../../../common/api/timeline';

export const NEW_TIMELINE_BTN = i18n.translate(
  'xpack.securitySolution.timeline.modal.newTimelineBtn',
  {
    defaultMessage: 'New',
  }
);

export const NEW_TIMELINE = i18n.translate('xpack.securitySolution.timeline.modal.newTimeline', {
  defaultMessage: 'New Timeline',
});

export const NEW_TEMPLATE_TIMELINE = i18n.translate(
  'xpack.securitySolution.timeline.modal.newTimelineTemplate',
  {
    defaultMessage: 'New Timeline template',
  }
);

export const OPEN_TIMELINE_BTN = i18n.translate(
  'xpack.securitySolution.timeline.modal.openTimelineBtn',
  {
    defaultMessage: 'Open',
  }
);

export const OPEN_TIMELINE_BTN_LABEL = i18n.translate(
  'xpack.securitySolution.timeline.modal.openTimelineBtnLabel',
  {
    defaultMessage: 'Open Existing Timeline',
  }
);

export const ATTACH_TO_CASE = i18n.translate(
  'xpack.securitySolution.timeline.modal.attachToCaseButtonLabel',
  {
    defaultMessage: 'Attach to case',
  }
);

export const ATTACH_TO_NEW_CASE = i18n.translate(
  'xpack.securitySolution.timeline.modal.attachToNewCaseButtonLabel',
  {
    defaultMessage: 'Attach to new case',
  }
);
export const ATTACH_TO_EXISTING_CASE = i18n.translate(
  'xpack.securitySolution.timeline.modal.attachToExistingCaseButtonLabel',
  {
    defaultMessage: 'Attach to existing case',
  }
);

export const CALL_OUT_UNAUTHORIZED_MSG = i18n.translate(
  'xpack.securitySolution.timeline.callOut.unauthorized.message.description',
  {
    defaultMessage:
      'You can use Timeline to investigate events, but you do not have the required permissions to save timelines for future use. If you need to save timelines, contact your Kibana administrator.',
  }
);

export const SAVE_TIMELINE = i18n.translate(
  'xpack.securitySolution.timeline.saveTimeline.modal.header',
  {
    defaultMessage: 'Save Timeline',
  }
);

export const SAVE_TIMELINE_TEMPLATE = i18n.translate(
  'xpack.securitySolution.timeline.saveTimelineTemplate.modal.header',
  {
    defaultMessage: 'Save Timeline Template',
  }
);

export const SAVE = i18n.translate('xpack.securitySolution.timeline.nameTimeline.save.title', {
  defaultMessage: 'Save',
});

export const NAME_TIMELINE_TEMPLATE = i18n.translate(
  'xpack.securitySolution.timeline.nameTimelineTemplate.modal.header',
  {
    defaultMessage: 'Name Timeline Template',
  }
);

export const DISCARD_TIMELINE = i18n.translate(
  'xpack.securitySolution.timeline.saveTimeline.modal.discard.title',
  {
    defaultMessage: 'Discard Timeline',
  }
);

export const DISCARD_TIMELINE_TEMPLATE = i18n.translate(
  'xpack.securitySolution.timeline.saveTimelineTemplate.modal.discard.title',
  {
    defaultMessage: 'Discard Timeline Template',
  }
);

export const CLOSE_MODAL = i18n.translate(
  'xpack.securitySolution.timeline.saveTimeline.modal.close.title',
  {
    defaultMessage: 'Close',
  }
);

export const UNSAVED_TIMELINE_WARNING = (timelineType: TimelineType) =>
  i18n.translate('xpack.securitySolution.timeline.saveTimeline.modal.warning.title', {
    values: {
      timeline: timelineType === TimelineTypeEnum.template ? 'timeline template' : 'timeline',
    },
    defaultMessage: 'You have an unsaved {timeline}. Do you wish to save it?',
  });

export const TIMELINE_TITLE = i18n.translate(
  'xpack.securitySolution.timeline.saveTimeline.modal.titleAriaLabel',
  {
    defaultMessage: 'Title',
  }
);

export const TIMELINE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.timeline.saveTimeline.modal.descriptionLabel',
  {
    defaultMessage: 'Description',
  }
);

export const OPTIONAL = i18n.translate(
  'xpack.securitySolution.timeline.saveTimeline.modal.optionalLabel',
  {
    defaultMessage: 'Optional',
  }
);

export const TITLE = i18n.translate('xpack.securitySolution.timeline.saveTimeline.modal.title', {
  defaultMessage: 'Title',
});

export const SAVE_AS_NEW = i18n.translate(
  'xpack.securitySolution.timeline.saveTimeline.modal.saveAsNew',
  {
    defaultMessage: 'Save as new timeline',
  }
);
