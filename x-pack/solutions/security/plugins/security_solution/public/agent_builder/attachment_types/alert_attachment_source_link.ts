/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentSourceLink } from '@kbn/agent-builder-browser/attachments';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import type { ApplicationStart } from '@kbn/core-application-browser';
import { APP_UI_ID, DEFAULT_PREVIEW_INDEX } from '../../../common/constants';
import { buildAlertDetailPath } from '../../../common/utils/alert_detail_path';
import { getAlertIndexAlias } from '../../flyout/document_details/shared/hooks/use_event_details';

const readStringField = (data: Record<string, unknown>, field: string): string | undefined => {
  let value = data[field];

  // Older attachments from the alert summary table stored nested arrays for @timestamp.
  if (Array.isArray(value) && value.length > 0 && Array.isArray(value[0])) {
    value = value[0];
  }

  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].length > 0) {
    return value[0];
  }
  return undefined;
};

export const parseAlertAttachmentPayload = (
  attachment: UnknownAttachment
): Record<string, unknown> | undefined => {
  const alert = attachment.data?.alert;
  if (typeof alert !== 'string' || alert.trim().length === 0) {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(alert);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return undefined;
  }

  return undefined;
};

export const buildAlertAttachmentSourceLink = ({
  attachment,
  application,
}: {
  attachment: UnknownAttachment;
  application: ApplicationStart;
}): AttachmentSourceLink | undefined => {
  const alertData = parseAlertAttachmentPayload(attachment);
  if (!alertData) {
    return undefined;
  }

  const alertId = readStringField(alertData, '_id');
  const rawIndex = readStringField(alertData, '_index');
  const timestamp = readStringField(alertData, '@timestamp');

  if (!alertId || !rawIndex || !timestamp) {
    return undefined;
  }

  if (rawIndex.includes(DEFAULT_PREVIEW_INDEX)) {
    return undefined;
  }

  const index = getAlertIndexAlias(rawIndex) ?? rawIndex;
  const path = buildAlertDetailPath({
    alertId,
    index,
    timestamp,
  });

  return {
    href: application.getUrlForApp(APP_UI_ID, { path }),
  };
};
