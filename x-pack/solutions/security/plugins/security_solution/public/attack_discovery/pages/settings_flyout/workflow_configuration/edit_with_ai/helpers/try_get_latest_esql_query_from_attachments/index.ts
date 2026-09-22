/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType, getLatestVersion } from '@kbn/agent-builder-common/attachments';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const tryGetLatestEsqlQueryFromAttachments = (
  attachments?: VersionedAttachment[]
): string | undefined => {
  if (!attachments?.length) {
    return undefined;
  }

  const latestEsqlAttachment = [...attachments].reverse().find((attachment) => {
    return attachment.type === AttachmentType.esql;
  });

  if (!latestEsqlAttachment) {
    return undefined;
  }

  const latestVersion = getLatestVersion(latestEsqlAttachment);
  if (!latestVersion) {
    return undefined;
  }

  const data = latestVersion.data;
  if (!isRecord(data)) {
    return undefined;
  }

  const { query } = data;
  if (typeof query !== 'string') {
    return undefined;
  }

  return query;
};
