/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import type { UnifiedReferenceAttachmentViewProps } from '@kbn/cases-plugin/public';
import { defineAttachment } from '@kbn/cases-plugin/public';
import { AttachmentActionType, SECURITY_ATTACK_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import { EuiLoadingSpinner } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type {
  AttackAttachmentMetadata,
  AttackAttachmentPayload,
} from '../../../../common/cases/attachments/attack';
import { AttackAttachmentPayloadSchema } from '../../../../common/cases/attachments/attack';

export type { AttackAttachmentMetadata };

const AttackAttachmentChildrenLazy = React.lazy(() => import('./components/attachment_children'));
const ShowAttackButton = React.lazy(async () => {
  const { ShowAttackButton: Component } = await import('./components/show_attack_button');
  return { default: Component };
});

type AttackAttachmentViewProps = UnifiedReferenceAttachmentViewProps<
  AttackAttachmentPayload['metadata'],
  AttackAttachmentPayload['attachmentId']
>;

const DISPLAY_NAME = i18n.translate('xpack.securitySolution.attackDiscovery.cases.displayName', {
  defaultMessage: 'Attacks',
});

export const getAttackAttachment = () =>
  defineAttachment({
    id: SECURITY_ATTACK_ATTACHMENT_TYPE,
    getIcon: () => 'securitySignalDetected',
    getLabel: () => DISPLAY_NAME,
    schema: AttackAttachmentPayloadSchema,
    getCreationActivity: () => ({
      eventColor: 'subdued' as const,
      event: (
        <FormattedMessage
          id="xpack.securitySolution.attackDiscovery.cases.eventDescription"
          defaultMessage="added an attack"
        />
      ),
      children: AttackAttachmentChildrenLazy,
      getActions: (actionProps: AttackAttachmentViewProps) => {
        const { attachmentId, metadata, savedObjectId } = actionProps;
        if (!metadata) {
          return [];
        }

        return [
          {
            type: AttachmentActionType.CUSTOM as const,
            isPrimary: true,
            render: () => (
              <Suspense fallback={<EuiLoadingSpinner size="m" />}>
                <ShowAttackButton
                  id={savedObjectId}
                  attackId={attachmentId}
                  indexName={metadata.index}
                  attackTitle={metadata.title}
                />
              </Suspense>
            ),
          },
        ];
      },
    }),
  });
