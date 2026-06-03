/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';

import {
  EuiBadge,
  EuiButtonIcon,
  EuiCode,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  ActionButtonType,
  type AttachmentUIDefinition,
} from '@kbn/agent-builder-browser/attachments';

import {
  type NightshiftCreateApiKeyAttachment,
  type NightshiftCreateApiKeyAttachmentData,
} from './nightshift_create_api_key_constants';
import { openCreateApiKeyFlyout, useCreatedApiKey } from './nightshift_created_api_keys_store';

/* ----------------------------------------------------------------------- *
 * Agent Builder attachment UI for the "Create API key" affordance.
 *
 * Renders as a single-row header-only card matching the Figma design
 * (Project Nightshift / node 1483:88535): subdued background, 72px
 * height, primary-tinted key tile on the left, title + description in
 * the middle, and a text-coloured "Open flyout" button on the right.
 *
 * The framework's `AttachmentHeader` (see
 * `agent_builder/public/.../attachments/attachment_header.tsx`)
 * already renders that layout for us when:
 *  - `getLabel` provides the title
 *  - `getDescription` provides the subtitle (React node)
 *  - `getIcon` provides the tile icon (`tokenKey`)
 *  - `getActionButtons` returns one PRIMARY button (rendered as
 *    `EuiButton color="text" size="s"` — pixel-identical to the Figma)
 *
 * We intentionally OMIT `renderInlineContent` so the framework skips
 * the body `EuiSplitPanel.Inner` entirely and the card collapses to
 * the single 72px header row.
 *
 * On click, the Open flyout handler pushes a target into
 * `createApiKeyFlyoutTarget$`; the global flyout host (mounted into
 * `document.body` from the plugin's `start` lifecycle) renders the
 * platform-shared `ApiKeyFlyout` over the page. On success the host
 * records the created key into the per-attachment store; the React
 * `getDescription` component subscribes and flips to a "Created"
 * confirmation state without re-evaluating the rest of the definition.
 * ----------------------------------------------------------------------- */

const KEY_ICON: IconType = 'tokenKey';

const PENDING_DESCRIPTION = i18n.translate(
  'xpack.searchHomepage.nightshift.createApiKey.pendingDescription',
  {
    defaultMessage:
      'Opens the API key creation flyout. Fill in the details, copy the key and confirm.',
  }
);

/**
 * Description slot inside the framework header. Switches between the
 * Figma "pending" copy and a "Created" success line with a one-shot
 * copy affordance once the user has filled in the flyout.
 */
const HeaderDescription: React.FC<{ data: NightshiftCreateApiKeyAttachmentData }> = ({ data }) => {
  const { euiTheme } = useEuiTheme();
  const created = useCreatedApiKey(data.id);

  if (!created) {
    return <span>{PENDING_DESCRIPTION}</span>;
  }

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="xs"
      responsive={false}
      wrap
      css={css`
        /* Header renders the description inside an xs EuiText —
         * keep the success badge baseline-aligned with the surrounding
         * subdued copy via the inline-flex group. */
        margin-top: ${euiTheme.size.xs};
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiBadge color="success" iconType="check">
          {i18n.translate('xpack.searchHomepage.nightshift.createApiKey.createdBadge', {
            defaultMessage: 'Created',
          })}
        </EuiBadge>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          <span>
            {i18n.translate('xpack.searchHomepage.nightshift.createApiKey.createdDescription', {
              defaultMessage: 'API key',
            })}{' '}
            <EuiCode transparentBackground>{created.name}</EuiCode>
          </span>
        </EuiText>
      </EuiFlexItem>
      {created.encoded && (
        <EuiFlexItem grow={false}>
          <EuiCopy textToCopy={created.encoded}>
            {(copy) => (
              <EuiButtonIcon
                iconType="copyClipboard"
                color="text"
                size="xs"
                aria-label={i18n.translate(
                  'xpack.searchHomepage.nightshift.createApiKey.copyValueAriaLabel',
                  { defaultMessage: 'Copy API key value' }
                )}
                data-test-subj={`nightshiftCreateApiKey-${data.id}-copyValue`}
                onClick={copy}
              />
            )}
          </EuiCopy>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

export const createNightshiftCreateApiKeyDefinition =
  (): AttachmentUIDefinition<NightshiftCreateApiKeyAttachment> => ({
    getLabel: () =>
      i18n.translate('xpack.searchHomepage.nightshift.createApiKey.label', {
        defaultMessage: 'Create API key',
      }),
    getDescription: (attachment) => <HeaderDescription data={attachment.data} />,
    getIcon: () => KEY_ICON,

    /*
     * Single PRIMARY button → framework renders as `EuiButton color="text"
     * size="s"` with the supplied icon. Matches Figma 1483:88770 1:1.
     *
     * NOTE: the framework memoises `getActionButtons` against the
     * attachment props only, so this list does not re-evaluate when the
     * created-keys store changes mid-render. That's fine for the
     * prototype — the user can click "Open flyout" again to create a
     * replacement key; the description below reflects the latest
     * created-state reactively (via `HeaderDescription`).
     */
    getActionButtons: ({ attachment }) => [
      {
        label: i18n.translate('xpack.searchHomepage.nightshift.createApiKey.openCta', {
          defaultMessage: 'Open',
        }),
        type: ActionButtonType.PRIMARY,
        handler: () =>
          openCreateApiKeyFlyout({
            attachmentId: attachment.data.id,
            defaultName: attachment.data.defaultName,
          }),
      },
    ],

    /*
     * Auto-render under every agent response so the user can reach the
     * Open / Created affordance without scrolling back to the original
     * round — same pattern as ambient screen-context attachments.
     */
    showInResponse: true,
  });
