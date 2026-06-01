/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';

import {
  EuiBadge,
  EuiButton,
  EuiButtonIcon,
  EuiCode,
  EuiCodeBlock,
  EuiCopy,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiDescriptionListProps, EuiThemeComputed, IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  ActionButtonType,
  type AttachmentUIDefinition,
} from '@kbn/agent-builder-browser/attachments';

import {
  API_KEY_BADGE_COLOR,
  accessRightsLabel,
  type ApiKeyExpirySeverity,
  type NightshiftApiKeyAttachment,
  type NightshiftApiKeyAttachmentData,
} from './nightshift_api_key_constants';

/* ----------------------------------------------------------------------- *
 * Agent Builder attachment UI definition for the VectorDB "Expiring API
 * keys" surface. Mirrors `nightshift_significant_event_definition.tsx`:
 *  - header carries the key name + an "Expires in …" / severity badge
 *  - canvas renders the full key metadata (access, index patterns,
 *    created/expires-at, notes) plus a "Reveal & copy" affordance for
 *    the actual key value
 *
 * Registered against `pluginsStart.agentBuilder.attachments` in
 * `search_homepage/public/plugin.ts`.
 * ----------------------------------------------------------------------- */

const SEVERITY_BADGE_LABEL: Record<ApiKeyExpirySeverity, (expiresIn: string) => string> = {
  critical: (expiresIn) =>
    i18n.translate('xpack.searchHomepage.nightshift.apiKey.severity.critical', {
      defaultMessage: 'Expires in {expiresIn}',
      values: { expiresIn },
    }),
  warning: (expiresIn) =>
    i18n.translate('xpack.searchHomepage.nightshift.apiKey.severity.warning', {
      defaultMessage: 'Expires in {expiresIn}',
      values: { expiresIn },
    }),
};

/**
 * Map severity → tile colour pair. Mirrors the row's badge palette so
 * the inline header glyph in the conversation reads the same way as
 * the row in the page footer.
 */
const getSeverityColors = (severity: ApiKeyExpirySeverity, theme: EuiThemeComputed) => {
  switch (severity) {
    case 'critical':
      return {
        background: theme.colors.backgroundBaseDanger,
        iconColor: theme.colors.textDanger,
      };
    case 'warning':
    default:
      return {
        background: theme.colors.backgroundBaseWarning,
        iconColor: theme.colors.textWarning,
      };
  }
};

/** Header description (rendered under the title): the expiry badge. */
const ApiKeyAttachmentDescription: React.FC<{ data: NightshiftApiKeyAttachmentData }> = ({
  data,
}) => (
  <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiBadge color={API_KEY_BADGE_COLOR[data.severity]}>
        {SEVERITY_BADGE_LABEL[data.severity](data.expiresIn)}
      </EuiBadge>
    </EuiFlexItem>
  </EuiFlexGroup>
);

interface ApiKeyValueRowProps {
  value: string;
}

/**
 * The actual API key value. Hidden behind a "reveal" toggle so the key
 * doesn't sit in the DOM in plain text on first paint; the "copy"
 * button always works regardless of the reveal state (matches the
 * Stack Management UX for the post-creation modal).
 */
const ApiKeyValueRow: React.FC<ApiKeyValueRowProps> = ({ value }) => {
  const { euiTheme } = useEuiTheme();
  const [revealed, setRevealed] = useState(false);
  const masked = '•'.repeat(Math.max(32, Math.min(value.length, 56)));

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder
      color="subdued"
      paddingSize="s"
      data-test-subj="nightshiftApiKeyValueRow"
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem
          css={css`
            min-width: 0;
          `}
        >
          {revealed ? (
            <EuiCodeBlock
              fontSize="s"
              paddingSize="s"
              isCopyable={false}
              transparentBackground
              css={css`
                /* Tight wrap, monospace, breaks long base64 strings on any character */
                word-break: break-all;
                color: ${euiTheme.colors.textParagraph};
              `}
            >
              {value}
            </EuiCodeBlock>
          ) : (
            <EuiText
              size="s"
              css={css`
                font-family: ${euiTheme.font.familyCode};
                color: ${euiTheme.colors.textSubdued};
                letter-spacing: 0.1em;
                word-break: break-all;
              `}
            >
              {masked}
            </EuiText>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType={revealed ? 'eyeClosed' : 'eye'}
            color="text"
            size="s"
            aria-label={
              revealed
                ? i18n.translate('xpack.searchHomepage.nightshift.apiKey.hideValueAriaLabel', {
                    defaultMessage: 'Hide API key value',
                  })
                : i18n.translate('xpack.searchHomepage.nightshift.apiKey.revealValueAriaLabel', {
                    defaultMessage: 'Reveal API key value',
                  })
            }
            data-test-subj="nightshiftApiKeyValueToggle"
            onClick={() => setRevealed((v) => !v)}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiCopy textToCopy={value}>
            {(copy) => (
              <EuiButtonIcon
                iconType="copyClipboard"
                color="primary"
                size="s"
                aria-label={i18n.translate(
                  'xpack.searchHomepage.nightshift.apiKey.copyValueAriaLabel',
                  { defaultMessage: 'Copy API key value' }
                )}
                data-test-subj="nightshiftApiKeyValueCopy"
                onClick={copy}
              />
            )}
          </EuiCopy>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

/**
 * Right-side canvas content rendered by the Agent Builder flyout when
 * the user previews the attachment. Mirrors the local row-level
 * details flyout in shape (description list + rotation notes) and
 * additionally exposes the API key value via the reveal/copy row
 * above — the canvas is the only place the "actual key" lives.
 */
const CanvasContent: React.FC<{ data: NightshiftApiKeyAttachmentData }> = ({ data }) => {
  const { euiTheme } = useEuiTheme();
  const severityColors = getSeverityColors(data.severity, euiTheme);
  const badgeColor = API_KEY_BADGE_COLOR[data.severity];
  const badgeLabel = SEVERITY_BADGE_LABEL[data.severity](data.expiresIn);

  const detailsItems: EuiDescriptionListProps['listItems'] = [
    {
      title: i18n.translate('xpack.searchHomepage.nightshift.apiKey.canvas.name', {
        defaultMessage: 'Name',
      }),
      description: <EuiCode>{data.name}</EuiCode>,
    },
    {
      title: i18n.translate('xpack.searchHomepage.nightshift.apiKey.canvas.access', {
        defaultMessage: 'Access',
      }),
      description: accessRightsLabel(data.accessRights),
    },
    {
      title: i18n.translate('xpack.searchHomepage.nightshift.apiKey.canvas.indexPatterns', {
        defaultMessage: 'Index patterns',
      }),
      description: (
        <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
          {data.indexPatterns.map((pattern) => (
            <EuiFlexItem grow={false} key={pattern}>
              <EuiCode>{pattern}</EuiCode>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      ),
    },
    {
      title: i18n.translate('xpack.searchHomepage.nightshift.apiKey.canvas.expiresAt', {
        defaultMessage: 'Expires',
      }),
      description: i18n.translate('xpack.searchHomepage.nightshift.apiKey.canvas.expiresAtValue', {
        defaultMessage: '{expiresAt} (in {expiresIn})',
        values: { expiresAt: data.expiresAt, expiresIn: data.expiresIn },
      }),
    },
    {
      title: i18n.translate('xpack.searchHomepage.nightshift.apiKey.canvas.createdAt', {
        defaultMessage: 'Created',
      }),
      description: data.createdAt,
    },
  ];

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder={false}
      paddingSize="l"
      color="transparent"
      data-test-subj={`nightshiftApiKeyCanvas-${data.id}`}
      css={css`
        background: ${euiTheme.colors.body};
        min-height: 100%;
      `}
    >
      <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <div
                aria-hidden
                css={css`
                  width: 32px;
                  height: 32px;
                  border-radius: ${euiTheme.border.radius.small};
                  background: ${severityColors.background};
                  display: inline-flex;
                  align-items: center;
                  justify-content: center;
                `}
              >
                <EuiIcon type="key" size="m" color={severityColors.iconColor} />
              </div>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="xxs">
                <h3>{data.name}</h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color={badgeColor}>{badgeLabel}</EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiSpacer size="s" />

        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h4>
              {i18n.translate('xpack.searchHomepage.nightshift.apiKey.canvas.valueTitle', {
                defaultMessage: 'API key value',
              })}
            </h4>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <ApiKeyValueRow value={data.value} />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h4>
              {i18n.translate('xpack.searchHomepage.nightshift.apiKey.canvas.detailsTitle', {
                defaultMessage: 'Details',
              })}
            </h4>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiDescriptionList
            listItems={detailsItems}
            type="column"
            align="left"
            compressed
            columnWidths={[12, 18]}
          />
        </EuiFlexItem>

        {data.description && (
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxs">
              <h4>
                {i18n.translate('xpack.searchHomepage.nightshift.apiKey.canvas.notesTitle', {
                  defaultMessage: 'Rotation notes',
                })}
              </h4>
            </EuiTitle>
            <EuiSpacer size="xs" />
            <EuiPanel hasShadow={false} hasBorder paddingSize="m" color="subdued">
              <EuiText size="s" color="subdued">
                <p>{data.description}</p>
              </EuiText>
            </EuiPanel>
          </EuiFlexItem>
        )}

        <EuiSpacer size="s" />

        <EuiFlexItem grow={false}>
          <EuiCopy textToCopy={data.value}>
            {(copy) => (
              <EuiButton
                fill
                iconType="copyClipboard"
                data-test-subj="nightshiftApiKeyCanvasCopyValue"
                onClick={copy}
              >
                {i18n.translate('xpack.searchHomepage.nightshift.apiKey.canvas.copyValueCta', {
                  defaultMessage: 'Copy API key value',
                })}
              </EuiButton>
            )}
          </EuiCopy>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

const KEY_ICON: IconType = 'key';

/**
 * Build the Agent Builder attachment UI definition. Registered from
 * `searchHomepage`'s `start` lifecycle when the optional
 * `agentBuilder` plugin is available.
 */
export const createNightshiftApiKeyDefinition =
  (): AttachmentUIDefinition<NightshiftApiKeyAttachment> => ({
    getLabel: (attachment) => attachment.data.name,
    /*
     * The severity / expiry badge sits in the header description, right
     * under the title — same shape as `nightshift_significant_event`.
     * No `renderInlineContent` (the attachment renders as a compact
     * header-only card; full detail lives in the canvas).
     */
    getDescription: (attachment) => <ApiKeyAttachmentDescription data={attachment.data} />,
    getIcon: () => KEY_ICON,
    canvasWidth: '40vw',

    renderCanvasContent: ({ attachment }) => <CanvasContent data={attachment.data} />,

    getActionButtons: ({ isCanvas, openCanvas }) => {
      if (isCanvas) return [];
      return [
        {
          label: i18n.translate('xpack.searchHomepage.nightshift.apiKey.preview', {
            defaultMessage: 'Preview',
          }),
          icon: 'expand',
          type: ActionButtonType.SECONDARY,
          handler: () => openCanvas?.(),
        },
      ];
    },
  });
