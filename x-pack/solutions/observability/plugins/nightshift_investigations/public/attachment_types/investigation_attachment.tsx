/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  ActionButtonType,
  type AttachmentUIDefinition,
} from '@kbn/agent-builder-browser/attachments';
import { InvestigationOutput } from '@kbn/investigation-output';
import { getSeverityLabel } from '@kbn/significant-events-schema';
import type { NightshiftInvestigationAttachment } from '../../common/investigation_attachment';

const labels = {
  title: i18n.translate('xpack.nightshiftInvestigations.attachment.label', {
    defaultMessage: 'Investigation',
  }),
  open: i18n.translate('xpack.nightshiftInvestigations.attachment.openButton', {
    defaultMessage: 'Open findings',
  }),
};

/**
 * Renders an investigation's findings on a Canvas, using the same component the investigation
 * flyout renders, so the two surfaces cannot drift. The workflow only writes the attachment once
 * a run succeeds, so the findings are always final here — hence the fixed `complete` status.
 */
export const investigationAttachmentDefinition: AttachmentUIDefinition<NightshiftInvestigationAttachment> =
  {
    getLabel: () => labels.title,
    getIcon: () => 'inspect',
    getHeader: ({ attachment }) => ({
      icon: 'inspect',
      subtitle: labels.title,
      badges: attachment.data.state.severity
        ? [{ label: getSeverityLabel(attachment.data.state.severity), color: 'hollow' }]
        : [],
    }),
    getActionButtons: ({ openCanvas, isCanvas }) => {
      if (isCanvas || !openCanvas) {
        return [];
      }
      return [
        {
          label: labels.open,
          type: ActionButtonType.SECONDARY,
          icon: 'eye',
          handler: openCanvas,
        },
      ];
    },
    renderCanvasContent: ({ attachment }) => (
      <EuiPanel hasShadow={false} hasBorder={false} paddingSize="m">
        <InvestigationOutput status="complete" state={attachment.data.state} />
      </EuiPanel>
    ),
  };
