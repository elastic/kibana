/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { defineAttachment } from '@kbn/cases-plugin/public';
import { SECURITY_ATTACK_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { AttackAttachmentMetadata } from '../../../../common/cases/attachments/attack';
import { AttackAttachmentPayloadSchema } from '../../../../common/cases/attachments/attack';

export type { AttackAttachmentMetadata };

const AttackAttachmentChildrenLazy = React.lazy(() => import('./components/attachment_children'));

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
    }),
  });
