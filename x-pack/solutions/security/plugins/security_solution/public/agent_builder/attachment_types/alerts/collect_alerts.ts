/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import type { DocumentDescriptor } from '../../../flyout_v2/shared/url_state/flyout_v2_url_param';
import {
  RULE_NAME_FIELD,
  firstString,
  parseAlertPayload,
  toDocumentDescriptor,
} from './to_alert_descriptor';

export interface CollectedAlerts {
  ids: string[];
  /** Alerts whose attachment carries their concrete index. */
  descriptors: Map<string, DocumentDescriptor>;
  /** Rule names the attachments carry, by alert id. */
  names: Map<string, string>;
  createdAt: string | undefined;
}

const isString = (value: unknown): value is string => typeof value === 'string';

const warnedAttachmentIds = new Set<string>();

const warnOnce = (attachmentId: string) => {
  if (warnedAttachmentIds.has(attachmentId)) {
    return;
  }
  warnedAttachmentIds.add(attachmentId);
  window.console.warn(
    `Alert attachment ${attachmentId} has a prose-only payload and no alert id could be found for it, so it is not shown`
  );
};

/** Merges the alerts of every alert attachment, so an alert named twice counts once. */
export const collectAlerts = (attachments: readonly UnknownAttachment[]): CollectedAlerts => {
  const descriptors = new Map<string, DocumentDescriptor>();
  const names = new Map<string, string>();
  const ids = new Set<string>();
  let createdAt: string | undefined;

  for (const attachment of attachments) {
    const attachmentCreatedAt = attachment.versionData?.createdAt;
    if (attachmentCreatedAt && (!createdAt || attachmentCreatedAt < createdAt)) {
      createdAt = attachmentCreatedAt;
    }

    const alertIds = (attachment.data as { alertIds?: unknown } | undefined)?.alertIds;
    if (Array.isArray(alertIds)) {
      alertIds.filter(isString).forEach((id) => ids.add(id));
    }

    if (attachment.type === SecurityAgentBuilderAttachments.alert) {
      const payload = parseAlertPayload(attachment);
      const documentId = firstString(payload?._id);

      if (payload && documentId) {
        ids.add(documentId);
        const descriptor = toDocumentDescriptor(payload);
        if (descriptor && !descriptors.has(documentId)) {
          descriptors.set(documentId, descriptor);
        }
        const name = firstString(payload[RULE_NAME_FIELD]);
        if (name && !names.has(documentId)) {
          names.set(documentId, name);
        }
      } else {
        warnOnce(attachment.id);
      }
    }
  }

  return { ids: [...ids], descriptors, names, createdAt };
};
