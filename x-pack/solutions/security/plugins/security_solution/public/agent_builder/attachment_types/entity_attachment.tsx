/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCodeBlock } from '@elastic/eui';
import { css } from '@emotion/react';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import {
  ActionButtonType,
  type AttachmentUIDefinition,
  type AttachmentRenderProps,
} from '@kbn/agent-builder-browser/attachments';
import type { SecurityAgentBuilderAttachments } from '../../../common/constants';

export type EntityAttachment = Attachment<
  SecurityAgentBuilderAttachments.entity,
  { identifierType: string; identifier: string; link?: string }
>;

const codeBlockStyles = css`
  width: 100%;
  & pre {
    margin-block-end: 0;
  }
`;

const EntityInlineContent: React.FC<AttachmentRenderProps<EntityAttachment>> = ({ attachment }) => (
  <EuiCodeBlock language="text" fontSize="s" overflowHeight={300} css={codeBlockStyles}>
    {'hello!'}
  </EuiCodeBlock>
);

/**
 * UI definition for entity attachments
 */
export const entityAttachmentDefinition: AttachmentUIDefinition<EntityAttachment> = {
  getLabel: () =>
    i18n.translate('xpack.securitySolution.agentBuilder.attachments.entity.label', {
      defaultMessage: 'Risk Entity',
    }),
  getIcon: () => 'user',
  renderInlineContent: (props) => {
    console.log('rendering inline content for entity attachment', props);
    return <EntityInlineContent {...props} />;
  },
  getActionButtons: ({ attachment }) => [
    {
      label: i18n.translate('xpack.securitySolution.agentBuilder.attachments.entity.open', {
        defaultMessage: 'Open',
      }),
      icon: 'external',
      type: ActionButtonType.PRIMARY,
      handler: async () => {
        if (attachment.data.link) {
          window.open(attachment.data.link, '_blank');
        }
      },
    },
  ],
};
