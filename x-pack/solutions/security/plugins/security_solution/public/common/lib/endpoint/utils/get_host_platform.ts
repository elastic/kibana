/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Ecs } from '@elastic/ecs';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { get } from 'lodash';
import { parseEcsFieldPath } from '..';
import type { SupportedHostOsType } from '../../../../../common/endpoint/constants';
import type { MaybeImmutable } from '../../../../../common/endpoint/types';
import { getAlertDetailsFieldValue } from './get_event_details_field_values';
import type { Platform } from '../../../../management/components/endpoint_responder/components/header_info/platforms';
import { SUPPORTED_HOST_OS_TYPE } from '../../../../../common/endpoint/constants';

type EcsHostData = MaybeImmutable<Pick<Ecs, 'host'>>;

const isTimelineEventDetailsItems = (
  data: EcsHostData | TimelineEventsDetailsItem[]
): data is TimelineEventsDetailsItem[] => {
  return Array.isArray(data);
};

// The list of ECS fields we check to try and determine the OS type
const ECS_OS_TYPE_FIELDS = Object.freeze(['host.os.type', 'host.os.name', 'host.os.platform']);

/**
 * Retrieve a host's platform type from either ECS data or Event Details list of items
 * @param data
 */
export const getHostPlatform = (
  data: EcsHostData | TimelineEventsDetailsItem[]
): SupportedHostOsType => {
  let platform = '';

  for (const field of ECS_OS_TYPE_FIELDS) {
    let fieldValue = '';

    if (isTimelineEventDetailsItems(data)) {
      fieldValue = getAlertDetailsFieldValue(
        { category: parseEcsFieldPath(field).category, field },
        data
      ).toLowerCase();
    } else {
      fieldValue = get(data, field, '').toLowerCase();
    }

    if (SUPPORTED_HOST_OS_TYPE.includes(fieldValue as Platform)) {
      platform = fieldValue;
      break;
    }
  }

  return platform as Platform;
};
