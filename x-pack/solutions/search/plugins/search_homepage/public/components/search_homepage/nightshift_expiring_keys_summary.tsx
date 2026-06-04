/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { css } from '@emotion/react';

import {
  EuiAccordion,
  EuiBadge,
  EuiButtonIcon,
  EuiCode,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiDescriptionListProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AiButton } from '@kbn/shared-ux-ai-components';

import {
  API_KEY_BADGE_COLOR,
  EXPIRING_API_KEYS,
  NIGHTSHIFT_API_KEY_TYPE,
  accessRightsLabel,
  type NightshiftApiKeyAttachmentData,
} from './agent_brief/nightshift_api_key_constants';
import { addNightshiftAttachment } from './nightshift_attachments';

/* ----------------------------------------------------------------------- *
 * VectorDB "Expiring API keys" footer panel.
 *
 * Mirrors the obs Nightshift "Morning" footer pattern
 * (`nightshift_fixed_events_summary.tsx`) — accordion list + a single
 * AI CTA — but the content is Search/VectorDB-specific: API keys
 * nearing expiry, with a button that hands off to Agent Builder
 * asking the agent to create new keys with equivalent scopes.
 *
 * Each row has two attachment-style affordances on the right:
 *  - the paperclip stages an Agent Builder attachment carrying the
 *    full key payload (rendered as a pill on the homepage input;
 *    forwarded to Agent Builder via `initialAttachments` on submit)
 *  - the maximise icon on the left opens a local push flyout with
 *    the same metadata so the user can inspect without going to the
 *    chat
 *
 * The fixture itself + the access-rights label + the severity → badge
 * colour map live in `./agent_brief/nightshift_api_key_constants` so
 * the Agent Builder attachment renderer can reuse them without
 * pulling in this EUI-heavy module.
 * ----------------------------------------------------------------------- */

type ExpiringApiKey = NightshiftApiKeyAttachmentData;

interface ExpiringApiKeyRowProps {
  apiKey: ExpiringApiKey;
  isLast: boolean;
  onOpenDetails: (apiKey: ExpiringApiKey) => void;
}

const ExpiringApiKeyRow: React.FC<ExpiringApiKeyRowProps> = ({ apiKey, isLast, onOpenDetails }) => {
  const { euiTheme } = useEuiTheme();
  const badgeColor = API_KEY_BADGE_COLOR[apiKey.severity];
  const badgeLabel = i18n.translate(
    'xpack.searchHomepage.nightshift.expiringKeys.badge.expiresIn',
    {
      defaultMessage: 'Expires in {expiresIn}',
      values: { expiresIn: apiKey.expiresIn },
    }
  );

  return (
    <div
      css={css`
        /*
         * Row layout: fits inside the wrapping container's content box
         * (no negative-margin escape) so it never overflows past the
         * panel's \`overflow: hidden\` boundary regardless of badge or
         * column content length. The bottom divider runs the full row
         * width via \`width: 100%\` + \`box-sizing: border-box\`.
         */
        width: 100%;
        box-sizing: border-box;
        padding: 12px 0;
        background: ${euiTheme.colors.backgroundBasePlain};
        border-bottom: ${isLast ? 'none' : euiTheme.border.thin};
      `}
      data-test-subj={`nightshiftExpiringApiKey-${apiKey.id}`}
    >
      <EuiFlexGroup
        alignItems="center"
        gutterSize="s"
        responsive={false}
        css={css`
          min-width: 0;
        `}
      >
        {/*
         * Left-side maximise button — opens a push flyout with the
         * full key metadata. \`flex-shrink: 0\` so it stays at its
         * natural size even when the row narrows.
         */}
        <EuiFlexItem
          grow={false}
          css={css`
            flex-shrink: 0;
          `}
        >
          <EuiButtonIcon
            iconType="maximize"
            color="text"
            size="xs"
            aria-label={i18n.translate(
              'xpack.searchHomepage.nightshift.expiringKeys.openDetailsAriaLabel',
              {
                defaultMessage: 'Open "{name}" details',
                values: { name: apiKey.name },
              }
            )}
            data-test-subj={`nightshiftExpiringApiKey-${apiKey.id}-openDetails`}
            onClick={() => onOpenDetails(apiKey)}
          />
        </EuiFlexItem>

        {/* Name column — shrinks first, ellipsis on overflow */}
        <EuiFlexItem
          css={css`
            min-width: 0;
            flex: 1.4 1 0;
          `}
        >
          <EuiText
            size="xs"
            css={css`
              color: ${euiTheme.colors.textPrimary};
              font-weight: ${euiTheme.font.weight.semiBold};
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            `}
            title={apiKey.name}
          >
            {apiKey.name}
          </EuiText>
        </EuiFlexItem>

        {/* Access rights column — shrinks second */}
        <EuiFlexItem
          css={css`
            min-width: 0;
            flex: 1 1 0;
          `}
        >
          <div
            css={css`
              display: flex;
              min-width: 0;
            `}
          >
            <EuiBadge
              color="hollow"
              data-test-subj={`nightshiftExpiringApiKey-${apiKey.id}-accessBadge`}
              title={`${accessRightsLabel(apiKey.accessRights)} \u2014 ${apiKey.indexPatterns.join(
                ', '
              )}`}
            >
              {accessRightsLabel(apiKey.accessRights)}
            </EuiBadge>
          </div>
        </EuiFlexItem>

        {/*
         * Right-side badge + actions. \`flex-shrink: 0\` so the badge
         * + icons stay intact when the row narrows — the name/access
         * columns absorb the missing space via their ellipsis.
         */}
        <EuiFlexItem
          grow={false}
          css={css`
            flex-shrink: 0;
          `}
        >
          <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiBadge
                color={badgeColor}
                data-test-subj={`nightshiftExpiringApiKey-${apiKey.id}-badge`}
              >
                {badgeLabel}
              </EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="paperClip"
                color="text"
                size="xs"
                aria-label={i18n.translate(
                  'xpack.searchHomepage.nightshift.expiringKeys.attachAriaLabel',
                  {
                    defaultMessage: 'Attach "{name}" to the input',
                    values: { name: apiKey.name },
                  }
                )}
                data-test-subj={`nightshiftExpiringApiKey-${apiKey.id}-attach`}
                onClick={() =>
                  /*
                   * Stage a pill on the homepage input and carry the
                   * full API key data as the Agent Builder payload.
                   * On submit the input drains the payloads and the
                   * parent forwards them via `initialAttachments` to
                   * the new conversation.
                   */
                  addNightshiftAttachment({
                    id: `apiKey:${apiKey.id}`,
                    label: apiKey.name,
                    iconType: 'key',
                    payload: {
                      id: `nightshift-api-key-${apiKey.id}`,
                      type: NIGHTSHIFT_API_KEY_TYPE,
                      data: apiKey,
                    },
                  })
                }
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="boxesHorizontal"
                color="text"
                size="xs"
                aria-label={i18n.translate(
                  'xpack.searchHomepage.nightshift.expiringKeys.moreAriaLabel',
                  { defaultMessage: 'More actions' }
                )}
                onClick={() => {}}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

interface ExpiringApiKeyDetailsFlyoutProps {
  apiKey: ExpiringApiKey;
  onClose: () => void;
}

/**
 * Push flyout rendered when the user clicks a row's "open details"
 * icon. Push (rather than overlay) so the user can still see the
 * homepage content and cross-reference. Width is tuned to a single
 * column of EuiDescriptionList rows.
 */
const ExpiringApiKeyDetailsFlyout: React.FC<ExpiringApiKeyDetailsFlyoutProps> = ({
  apiKey,
  onClose,
}) => {
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'expiringApiKeyDetailsTitle' });

  const detailsItems: EuiDescriptionListProps['listItems'] = [
    {
      title: i18n.translate('xpack.searchHomepage.nightshift.expiringKeys.flyout.name', {
        defaultMessage: 'Name',
      }),
      description: <EuiCode>{apiKey.name}</EuiCode>,
    },
    {
      title: i18n.translate('xpack.searchHomepage.nightshift.expiringKeys.flyout.access', {
        defaultMessage: 'Access',
      }),
      description: accessRightsLabel(apiKey.accessRights),
    },
    {
      title: i18n.translate('xpack.searchHomepage.nightshift.expiringKeys.flyout.indexPatterns', {
        defaultMessage: 'Index patterns',
      }),
      description: (
        <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
          {apiKey.indexPatterns.map((pattern) => (
            <EuiFlexItem grow={false} key={pattern}>
              <EuiCode>{pattern}</EuiCode>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      ),
    },
    {
      title: i18n.translate('xpack.searchHomepage.nightshift.expiringKeys.flyout.expiresAt', {
        defaultMessage: 'Expires',
      }),
      description: i18n.translate(
        'xpack.searchHomepage.nightshift.expiringKeys.flyout.expiresAtValue',
        {
          defaultMessage: '{expiresAt} (in {expiresIn})',
          values: { expiresAt: apiKey.expiresAt, expiresIn: apiKey.expiresIn },
        }
      ),
    },
    {
      title: i18n.translate('xpack.searchHomepage.nightshift.expiringKeys.flyout.createdAt', {
        defaultMessage: 'Created',
      }),
      description: apiKey.createdAt,
    },
  ];

  return (
    <EuiFlyout
      type="push"
      side="right"
      /*
       * Push the main content rather than overlay it — keeps the API
       * keys list and the page content visible while the flyout is
       * open. \`pushMinBreakpoint="xs"\` forces push mode at every
       * viewport size (default \`l\` would silently fall back to
       * overlay on narrower screens).
       */
      pushMinBreakpoint="xs"
      size="s"
      onClose={onClose}
      ownFocus={false}
      aria-labelledby={flyoutTitleId}
      data-test-subj="nightshiftExpiringApiKeyFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={flyoutTitleId}>
            {i18n.translate('xpack.searchHomepage.nightshift.expiringKeys.flyout.title', {
              defaultMessage: 'API key details',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiDescriptionList
          listItems={detailsItems}
          type="column"
          align="left"
          compressed
          columnWidths={[12, 18]}
        />
        {apiKey.description && (
          <>
            <EuiSpacer size="l" />
            <EuiTitle size="xxs">
              <h3>
                {i18n.translate('xpack.searchHomepage.nightshift.expiringKeys.flyout.notesTitle', {
                  defaultMessage: 'Rotation notes',
                })}
              </h3>
            </EuiTitle>
            <EuiSpacer size="xs" />
            <EuiText size="s" color="subdued">
              <p>{apiKey.description}</p>
            </EuiText>
          </>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

export interface NightshiftExpiringKeysSummaryProps {
  isExiting: boolean;
  onRotateKeys: () => void;
}

/**
 * VectorDB footer panel showing the API keys nearing expiry plus a
 * single primary CTA that hands off to the agent to create new keys.
 */
export const NightshiftExpiringKeysSummary: React.FC<NightshiftExpiringKeysSummaryProps> = ({
  isExiting,
  onRotateKeys,
}) => {
  const { euiTheme } = useEuiTheme();
  const accordionId = useGeneratedHtmlId({ prefix: 'nightshiftExpiringApiKeys' });
  const keyCount = EXPIRING_API_KEYS.length;

  const [openDetailsKey, setOpenDetailsKey] = useState<ExpiringApiKey | null>(null);
  const handleOpenDetails = useCallback((apiKey: ExpiringApiKey) => {
    setOpenDetailsKey(apiKey);
  }, []);
  const handleCloseDetails = useCallback(() => {
    setOpenDetailsKey(null);
  }, []);

  return (
    <>
      {/*
       * Intro line — sits above the accordion so the accordion's
       * clickable area is limited to the title + chevron and the
       * description doesn't inherit the underline-on-hover affordance.
       */}
      <EuiText size="s" color="subdued" data-test-subj="nightshiftExpiringKeysIntro">
        <p>
          {i18n.translate('xpack.searchHomepage.nightshift.expiringKeys.intro', {
            defaultMessage:
              'Some API keys are about to expire soon. Please rotate them before they expire. You can use AI Agent to help you.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiAccordion
        id={accordionId}
        arrowDisplay="right"
        initialIsOpen
        data-test-subj="nightshiftExpiringKeysAccordion"
        buttonContent={i18n.translate(
          'xpack.searchHomepage.nightshift.expiringKeys.accordionTitle',
          {
            defaultMessage: 'Expiring API keys ({count})',
            values: { count: keyCount },
          }
        )}
        css={css`
          margin: 0 0 8px 0;
          .euiAccordion__button {
            font-weight: ${euiTheme.font.weight.semiBold};
            padding-left: 0;
            padding-right: 0;
          }
        `}
      >
        <div
          data-test-subj="nightshiftExpiringKeysList"
          css={css`
            /*
             * The list sits inside the wrapping container's content
             * box so it never overflows past the panel's
             * \`overflow: hidden\` clipping boundary. The top border
             * still spans the full content width.
             */
            width: 100%;
            box-sizing: border-box;
            border-top: ${euiTheme.border.thin};
          `}
        >
          {EXPIRING_API_KEYS.map((apiKey, idx) => (
            <ExpiringApiKeyRow
              key={apiKey.id}
              apiKey={apiKey}
              isLast={idx === EXPIRING_API_KEYS.length - 1}
              onOpenDetails={handleOpenDetails}
            />
          ))}
        </div>
      </EuiAccordion>
      <EuiSpacer size="s" />
      <AiButton
        variant="base"
        size="s"
        iconType="productAgent"
        data-test-subj="nightshiftExpiringKeysRotate"
        isDisabled={isExiting}
        onClick={onRotateKeys}
      >
        {i18n.translate('xpack.searchHomepage.nightshift.expiringKeys.rotateCta', {
          defaultMessage: 'Create new API keys',
        })}
      </AiButton>

      {/*
       * Portal the flyout to \`document.body\` so it can never be
       * re-trapped by some future ancestor with \`transform\`,
       * \`filter\`, \`perspective\`, or \`will-change\` styles (all of
       * which create a new containing block for fixed-positioned
       * descendants and would otherwise pin the push flyout inside
       * the page column instead of the viewport edge).
       */}
      {openDetailsKey &&
        createPortal(
          <ExpiringApiKeyDetailsFlyout apiKey={openDetailsKey} onClose={handleCloseDetails} />,
          document.body
        )}
    </>
  );
};
