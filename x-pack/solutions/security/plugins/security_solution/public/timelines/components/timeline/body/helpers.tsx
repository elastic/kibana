/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import type { TimelineEventsType } from '../../../../../common/types/timeline';

export const isEventBuildingBlockType = (event: Ecs): boolean =>
  !isEmpty(event.kibana?.alert?.building_block_type);

export const isEvenEqlSequence = (event: Ecs): boolean => {
  if (!isEmpty(event.eql?.sequenceNumber)) {
    try {
      const sequenceNumber = (event.eql?.sequenceNumber ?? '').split('-')[0];
      return parseInt(sequenceNumber, 10) % 2 === 0;
    } catch {
      return false;
    }
  }
  return false;
};
/** Return eventType raw or signal or eql */
export const getEventType = (event: Ecs): Omit<TimelineEventsType, 'all'> => {
  if (!isEmpty(event?.eql?.parentId)) {
    return 'eql';
  } else if (!isEmpty(event?.kibana?.alert?.rule?.uuid)) {
    return 'signal';
  }

  return 'raw';
};

export const NOTE_CONTENT_CLASS_NAME = 'note-content';
