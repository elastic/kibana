/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

const ATTACHMENT_TYPE_LABELS = {
  detection: i18n.translate('xpack.nightshift.chatAttachment.type.detection', {
    defaultMessage: 'Detection',
  }),
  entity: i18n.translate('xpack.nightshift.chatAttachment.type.entity', {
    defaultMessage: 'Entity',
  }),
  significantEvent: i18n.translate('xpack.nightshift.chatAttachment.type.significantEvent', {
    defaultMessage: 'Significant Event',
  }),
  hypothesis: i18n.translate('xpack.nightshift.chatAttachment.type.hypothesis', {
    defaultMessage: 'Hypothesis',
  }),
  recommendation: i18n.translate('xpack.nightshift.chatAttachment.type.recommendation', {
    defaultMessage: 'Recommendation',
  }),
} as const;

export type NightshiftChatAttachmentType = keyof typeof ATTACHMENT_TYPE_LABELS;

/** Shown in Agent Builder as "Attachment added: {description}". */
export const formatChatAttachmentDescription = (
  attachmentType: NightshiftChatAttachmentType,
  name: string
): string =>
  i18n.translate('xpack.nightshift.chatAttachment.description', {
    defaultMessage: '[{attachmentType}] {name}',
    values: { attachmentType: ATTACHMENT_TYPE_LABELS[attachmentType], name },
  });
