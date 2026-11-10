/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import {
  CHANGE_POINT_TYPES,
  type ChangePointType,
  type LifecycleDetection,
} from '@kbn/significant-events-schema';

export const SIGNIFICANT_EVENT_DETECTION_ATTACHMENT_TYPE = 'platform.sig_event_detection' as const;

export type LifecycleDetectionInput = Omit<
  LifecycleDetection,
  'rule_name' | 'change_point_type'
> & {
  rule_name?: string;
  change_point_type: string;
};

const isChangePointType = (value: string): value is ChangePointType =>
  (CHANGE_POINT_TYPES as readonly string[]).includes(value);

export const toLifecycleDetection = (
  detection: LifecycleDetectionInput
): LifecycleDetection | undefined => {
  if (!detection.rule_name || !isChangePointType(detection.change_point_type)) {
    return undefined;
  }

  return {
    '@timestamp': detection['@timestamp'],
    detection_id: detection.detection_id,
    rule_name: detection.rule_name,
    rule_uuid: detection.rule_uuid,
    source_id: detection.source_id,
    change_point_type: detection.change_point_type,
  };
};

export type SignificantEventDetectionAttachment = Attachment<
  typeof SIGNIFICANT_EVENT_DETECTION_ATTACHMENT_TYPE,
  LifecycleDetection
>;
