/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export type NightshiftChatAttachmentType = 'Detection' | 'Entity' | 'Significant Event';

/** Shown in Agent Builder as "Attachment added: {description}". */
export const formatChatAttachmentDescription = (
  attachmentType: NightshiftChatAttachmentType,
  name: string
): string =>
  i18n.translate('xpack.observability.nightshift.chatAttachment.description', {
    defaultMessage: '[{attachmentType}] {name}',
    values: { attachmentType, name },
  });
