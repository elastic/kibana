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
 * Visual pill for a staged attachment on the Search homepage input.
 * Mirrors Agent Builder's `AttachmentPill` 1:1 (subdued panel + dark
 * shade border, 32px primary tile, 2-line clamp label, hover-revealed
 * remove button) so the hand-off into Agent Builder is visually
 * continuous. Co-located here rather than imported from observability
 * because cross-solution imports aren't allowed.
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
            <EuiIcon type={attachment.iconType ?? DEFAULT_PILL_ICON} size="m" color="primary" />
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
                'xpack.searchHomepage.nightshift.attachmentPill.removeAriaLabel',
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
