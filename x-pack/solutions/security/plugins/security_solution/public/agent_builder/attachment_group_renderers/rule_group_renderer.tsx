/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import { AttachmentGroupList, AttachmentRow } from '@kbn/agentic-investigations-common';
import type { AttachmentGroupRendererProps } from '@kbn/agentic-investigations-common';
import type { FlyoutDescriptor } from '../../flyout_v2/shared/url_state/flyout_v2_url_param';
import { toRuleDescriptor } from '../attachment_types/attachment_summary_drilldown/to_flyout_descriptor';
import type { RuleAttachment } from '../attachment_types/rule/helpers';
import { getRuleName } from '../attachment_types/rule/helpers';
import { AttachmentSummaryFlyoutOpener } from '../attachment_types/attachment_summary_drilldown/open_flyout_on_mount';
import type { SecurityCanvasEmbeddedBundle } from '../components/security_redux_embedded_provider';

interface RuleRowProps {
  label: string;
  descriptor: FlyoutDescriptor | null;
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}

const RuleRow = memo<RuleRowProps>(({ label, descriptor, resolveSecurityCanvasContext }) => {
  const [flyoutKey, setFlyoutKey] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = useCallback(() => {
    setFlyoutKey((k) => k + 1);
    setIsOpen(true);
  }, []);

  return (
    <AttachmentRow
      label={label}
      typeName="Rule"
      iconType="document"
      onClick={descriptor ? handleClick : undefined}
    >
      {isOpen && descriptor && (
        <AttachmentSummaryFlyoutOpener
          key={flyoutKey}
          descriptor={descriptor}
          resolveSecurityCanvasContext={resolveSecurityCanvasContext}
        />
      )}
    </AttachmentRow>
  );
});

RuleRow.displayName = 'RuleRow';

export const createRuleGroupRenderer = (
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>
): React.ComponentType<AttachmentGroupRendererProps> => {
  const RuleGroupRenderer = memo<AttachmentGroupRendererProps>(({ group, attachmentsService }) => {
    const rows = group.attachments.map((attachment) => {
      const label =
        getRuleName(attachment as RuleAttachment) ??
        (() => {
          try {
            return (
              attachmentsService.getAttachmentUiDefinition(attachment.type)?.getLabel(attachment) ??
              attachment.type
            );
          } catch {
            return attachment.type;
          }
        })();

      return (
        <RuleRow
          key={attachment.id}
          label={label}
          descriptor={toRuleDescriptor(attachment)}
          resolveSecurityCanvasContext={resolveSecurityCanvasContext}
        />
      );
    });

    return <AttachmentGroupList title={group.title ?? group.id} rows={rows} />;
  });

  RuleGroupRenderer.displayName = 'RuleGroupRenderer';
  return RuleGroupRenderer;
};
