/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import type { TimelineNonEcsData } from '../../../common/search_strategy';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import { stringifyEssentialAlertData } from '../helpers';

export const toStringArrayField = (value: unknown): string[] | undefined => {
  if (typeof value === 'string') {
    return value.length > 0 ? [value] : undefined;
  }

  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].length > 0) {
    return value as string[];
  }

  return undefined;
};

export const buildRawDataFromAlert = ({
  ecsData,
  nonEcsData,
}: {
  ecsData: Ecs;
  nonEcsData: TimelineNonEcsData[];
}): Record<string, string[]> => {
  const rawData = nonEcsData.reduce<Record<string, string[]>>((acc, { field, value }) => {
    if (value != null) {
      acc[field] = value;
    }
    return acc;
  }, {});

  const id = toStringArrayField(ecsData._id);
  if (id) {
    rawData._id = id;
  }

  const index = toStringArrayField(ecsData._index);
  if (index) {
    rawData._index = index;
  }

  const timestamp = toStringArrayField(ecsData['@timestamp']);
  if (timestamp) {
    rawData['@timestamp'] = timestamp;
  }

  return rawData;
};

export const buildAlertAttachmentInput = ({
  ecsData,
  nonEcsData,
}: {
  ecsData: Ecs;
  nonEcsData: TimelineNonEcsData[];
}): AttachmentInput => {
  const rawData = buildRawDataFromAlert({ ecsData, nonEcsData });
  const ruleName = rawData[ALERT_RULE_NAME]?.[0] ?? ecsData._id ?? 'Security alert';

  return {
    type: SecurityAgentBuilderAttachments.alert,
    data: {
      alert: stringifyEssentialAlertData(rawData),
      attachmentLabel: ruleName,
    },
  };
};

export const getAlertInvestigationTitle = ({
  ecsData,
  nonEcsData,
}: {
  ecsData: Ecs;
  nonEcsData: TimelineNonEcsData[];
}): string => {
  const rawData = buildRawDataFromAlert({ ecsData, nonEcsData });
  return rawData[ALERT_RULE_NAME]?.[0] ?? ecsData._id ?? 'Security alert';
};
