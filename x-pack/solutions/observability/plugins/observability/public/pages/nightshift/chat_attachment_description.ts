/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/** Shown in Agent Builder as "Attachment added: {description}". */
export const formatDetectionChatAttachmentDescription = (name: string): string =>
  i18n.translate('xpack.observability.nightshift.chatAttachment.detection', {
    defaultMessage: '[Detection] {name}',
    values: { name },
  });

export const formatEntityChatAttachmentDescription = (name: string): string =>
  i18n.translate('xpack.observability.nightshift.chatAttachment.entity', {
    defaultMessage: '[Entity] {name}',
    values: { name },
  });

export const formatSignificantEventChatAttachmentDescription = (name: string): string =>
  i18n.translate('xpack.observability.nightshift.chatAttachment.significantEvent', {
    defaultMessage: '[Significant event] {name}',
    values: { name },
  });
