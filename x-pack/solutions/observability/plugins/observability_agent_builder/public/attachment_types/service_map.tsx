/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ComponentType } from 'react';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { SERVICE_MAP_ATTACHMENT_TYPE } from '../../common/attachments';
import type { ServiceMapAttachmentData } from '../../common/attachments';
import type { ServiceMapRendererProps } from '../types';

type ServiceMapAttachment = Attachment<
  typeof SERVICE_MAP_ATTACHMENT_TYPE,
  ServiceMapAttachmentData
>;

export const registerServiceMapAttachment = ({
  attachments,
  getServiceMapComponent,
}: {
  attachments: AttachmentServiceStartContract;
  getServiceMapComponent: () => ComponentType<ServiceMapRendererProps> | null;
}) => {
  attachments.addAttachmentType<ServiceMapAttachment>(SERVICE_MAP_ATTACHMENT_TYPE, {
    getLabel: (attachment) =>
      attachment.data?.title ??
      i18n.translate('xpack.observabilityAgentBuilder.attachments.serviceMap.label', {
        defaultMessage: 'Service Map',
      }),
    getIcon: () => 'graphApp',
    renderInlineContent: ({ attachment }) => {
      const ServiceMapCanvas = getServiceMapComponent();
      if (!ServiceMapCanvas) {
        return null;
      }
      return (
        <div
          css={css`
            width: 100%;
            height: 500px;
          `}
        >
          <ServiceMapCanvas connections={attachment.data.connections} />
        </div>
      );
    },
  });
};
