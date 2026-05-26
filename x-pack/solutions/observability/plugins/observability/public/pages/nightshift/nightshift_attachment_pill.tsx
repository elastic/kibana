/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { NightshiftAttachment } from './nightshift_attachments';

interface NightshiftAttachmentPillProps {
  attachment: NightshiftAttachment;
  onRemove: () => void;
}

const DEFAULT_PILL_ICON = 'document';

/**
 * Visual pill for a staged attachment on the Nightshift input. Mirrors
 * Agent Builder's `AttachmentPill` (see
 * `agent_builder/public/application/components/conversations/conversation_input/attachment_pill.tsx`)
 * so the Nightshift → Agent Builder transition feels visually
 * continuous: 200px-max subdued panel with a thin dark-shade border, a
 * 32px primary-tinted icon tile on the left, the attachment label
 * (2-line clamp) in the middle, and a cross button on the right that
 * appears on hover.
 *
 * Unlike Agent Builder's pill this version is stateless data-wise —
 * removal is delegated to the parent via `onRemove`, which clears the
 * attachment from `nightshiftAttachments$`.
 */
export const NightshiftAttachmentPill: React.FC<NightshiftAttachmentPillProps> = ({
  attachment,
  onRemove,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder
      color="subdued"
      paddingSize="s"
      css={css`
        max-width: 200px;
        border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.darkShade};
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-test-subj={`nightshiftAttachmentPill-${attachment.id}`}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <div
            css={css`
              display: flex;
              align-items: center;
              justify-content: center;
              width: ${euiTheme.size.xl};
              height: ${euiTheme.size.xl};
              border-radius: ${euiTheme.border.radius.small};
              background-color: ${euiTheme.colors.backgroundBasePrimary};
            `}
          >
            <EuiIcon
              type={attachment.iconType ?? DEFAULT_PILL_ICON}
              size="m"
              color="primary"
            />
          </div>
        </EuiFlexItem>
        <EuiFlexItem
          css={css`
            min-width: 0;
          `}
        >
          <EuiText
            size="xs"
            css={css`
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              overflow: hidden;
              text-overflow: ellipsis;
              word-break: break-word;
            `}
          >
            <strong>{attachment.label}</strong>
          </EuiText>
        </EuiFlexItem>
        {isHovered && (
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="cross"
              size="xs"
              color="text"
              aria-label={i18n.translate(
                'xpack.observability.nightshift.attachmentPill.removeAriaLabel',
                { defaultMessage: 'Remove attachment' }
              )}
              onClick={onRemove}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
