/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import type { ExperimentalFeatures } from '../../../../common/experimental_features';
import type { EntityAttachment } from './types';
import { normaliseEntityAttachment } from './payload';
import { EntityAttachmentInlineContent } from './entity_attachment_inline_content';

const DEFAULT_LABEL = i18n.translate(
  'xpack.securitySolution.agentBuilder.attachments.entity.label',
  { defaultMessage: 'Risk Entity' }
);

const DEFAULT_LABEL_PLURAL = (count: number) =>
  i18n.translate('xpack.securitySolution.agentBuilder.attachments.entity.labelPlural', {
    defaultMessage: '{count} Risk Entities',
    values: { count },
  });

/**
 * Builds the rich `AttachmentUIDefinition` for `security.entity` attachments.
 * Only installed when the `entityAttachmentRichRenderer` experimental flag is
 * on; otherwise the minimal label-only config in `attachment_types/index.ts`
 * remains active.
 */
export const createEntityAttachmentDefinition = ({
  experimentalFeatures,
}: {
  experimentalFeatures: ExperimentalFeatures;
}): AttachmentUIDefinition<EntityAttachment> => ({
  getLabel: (attachment) => {
    const customLabel = attachment?.data?.attachmentLabel;
    if (customLabel) return customLabel;
    const parsed = normaliseEntityAttachment(attachment);
    if (!parsed) return DEFAULT_LABEL;
    if (parsed.isSingle) return DEFAULT_LABEL;
    return DEFAULT_LABEL_PLURAL(parsed.entities.length);
  },
  getIcon: () => 'user',
  renderInlineContent: (props) => (
    <EntityAttachmentInlineContent {...props} experimentalFeatures={experimentalFeatures} />
  ),
});
