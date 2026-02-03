/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { EVENT_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import type {
  AttachmentViewObject,
  RegisteredAttachmentType,
  RegisteredAttachmentViewProps,
} from '@kbn/cases-plugin/public/client/attachment_framework/types';
import * as i18n from './translations';

const EventListRenderer = lazy(() =>
  import('./event_list').then((module) => ({ default: module.EventList }))
);

const getEventAttachmentViewObject = (
  props: RegisteredAttachmentViewProps
): AttachmentViewObject<RegisteredAttachmentViewProps> => {
  return {
    event: i18n.ADDED_EVENT,
    timelineAvatar: 'bell',
    hideDefaultActions: false,
  };
};

export const getEventType = (): RegisteredAttachmentType => ({
  id: EVENT_ATTACHMENT_TYPE,
  icon: 'bell',
  displayName: 'Event',
  getAttachmentViewObject: getEventAttachmentViewObject,
  getAttachmentRemovalObject: () => ({ event: i18n.REMOVED_EVENT }),
  getAttachmentListRenderer: () => EventListRenderer,
});
