/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

/* ----------------------------------------------------------------------- *
 * "Connect Slack & Github" panel (replaces the previous Analyze → context
 * layer flow). Matches the Figma at Project Nightshift / node 1566:90736:
 *
 *  - Centered Heading-3: "Draft pull requests. Slack insights. Generate
 *    post mortem docs."
 *  - Subtitle: "Connect Slack and Github to get started."
 *  - A row of two equal-width "Tutorial item" cards, each with a brand
 *    icon + name on the left and a `Connect` `EuiButtonEmpty` on the
 *    right.
 *  - Footer line: "Using other apps? [Go to connectors] or [dismiss]
 *    this." with both phrases as inline links.
 *
 * Dark-mode friendly: every colour resolves through `useEuiTheme()`
 * semantic tokens, so cards stay readable on the dark surface used by
 * the Nightshift Healthy page.
 *
 * Click handlers (`Connect`, `Go to connectors`) are intentional
 * no-ops for the prototype; wiring them to the real connector setup
 * lands in a follow-up. `dismiss` is the only handler that mutates
 * state — it hides the panel for the rest of the session.
 * ----------------------------------------------------------------------- */

interface ConnectorOption {
  id: string;
  label: string;
  iconType: IconType;
  ariaLabel: string;
}

const CONNECTOR_OPTIONS: ConnectorOption[] = [
  {
    id: 'slack',
    label: i18n.translate('xpack.observability.nightshift.contextLayerTasks.slackLabel', {
      defaultMessage: 'Slack',
    }),
    iconType: 'logoSlack',
    ariaLabel: i18n.translate(
      'xpack.observability.nightshift.contextLayerTasks.slackConnectAriaLabel',
      { defaultMessage: 'Connect Slack' }
    ),
  },
  {
    id: 'github',
    label: i18n.translate('xpack.observability.nightshift.contextLayerTasks.githubLabel', {
      defaultMessage: 'Github',
    }),
    iconType: 'logoGithub',
    ariaLabel: i18n.translate(
      'xpack.observability.nightshift.contextLayerTasks.githubConnectAriaLabel',
      { defaultMessage: 'Connect Github' }
    ),
  },
];

export interface NightshiftContextLayerTasksPanelProps {
  isExiting?: boolean;
}

export const NightshiftContextLayerTasksPanel: React.FC<NightshiftContextLayerTasksPanelProps> = ({
  isExiting = false,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) {
    return null;
  }

  return (
    <EuiFlexItem
      grow={false}
      css={css`
        width: 100%;
      `}
      data-test-subj="nightshiftContextLayerTasks"
    >
      <EuiFlexGroup
        direction="column"
        alignItems="center"
        gutterSize="s"
        responsive={false}
        css={css`
          width: 100%;
          /* Figma frame uses 12px padding on the surrounding container. */
          padding: ${euiTheme.size.s};
        `}
      >
        {/* ---------- Heading + subtitle ---------- */}
        <EuiFlexItem
          grow={false}
          css={css`
            width: 100%;
          `}
        >
          <EuiTitle
            size="xs"
            css={css`
              text-align: center;
            `}
          >
            <h3>
              {i18n.translate('xpack.observability.nightshift.contextLayerTasks.title', {
                defaultMessage:
                  'Draft pull requests. Slack insights. Generate post mortem docs.',
              })}
            </h3>
          </EuiTitle>
          <EuiText
            size="s"
            color="subdued"
            textAlign="center"
            css={css`
              margin-top: ${euiTheme.size.xs};
            `}
          >
            <p>
              {i18n.translate('xpack.observability.nightshift.contextLayerTasks.subtitle', {
                defaultMessage: 'Connect Slack and Github to get started.',
              })}
            </p>
          </EuiText>
        </EuiFlexItem>

        {/* ---------- Connector cards row ---------- */}
        <EuiFlexItem
          grow={false}
          css={css`
            width: 100%;
          `}
        >
          <EuiFlexGroup gutterSize="s" responsive={false}>
            {CONNECTOR_OPTIONS.map((connector) => (
              <EuiFlexItem
                key={connector.id}
                grow={1}
                css={css`
                  min-width: 0;
                `}
              >
                <EuiPanel
                  hasShadow={false}
                  hasBorder
                  color="plain"
                  paddingSize="m"
                  data-test-subj={`nightshiftContextLayerConnector-${connector.id}`}
                  css={css`
                    border-color: ${euiTheme.colors.borderBaseSubdued};
                    border-radius: ${euiTheme.border.radius.medium};
                    /* Figma height = 56px including 16px vertical padding.
                     * Letting EUI compute the height keeps the card
                     * comfortable in dark theme where the body font
                     * may render slightly taller. */
                  `}
                >
                  <EuiFlexGroup
                    alignItems="center"
                    justifyContent="spaceBetween"
                    gutterSize="s"
                    responsive={false}
                  >
                    <EuiFlexItem
                      grow={false}
                      css={css`
                        min-width: 0;
                      `}
                    >
                      <EuiFlexGroup
                        alignItems="center"
                        gutterSize="s"
                        responsive={false}
                        css={css`
                          min-width: 0;
                        `}
                      >
                        <EuiFlexItem grow={false}>
                          <EuiIcon type={connector.iconType} size="l" aria-hidden />
                        </EuiFlexItem>
                        <EuiFlexItem
                          grow={false}
                          css={css`
                            min-width: 0;
                          `}
                        >
                          <EuiText
                            size="s"
                            css={css`
                              font-weight: ${euiTheme.font.weight.semiBold};
                              white-space: nowrap;
                              overflow: hidden;
                              text-overflow: ellipsis;
                            `}
                          >
                            {connector.label}
                          </EuiText>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty
                        size="xs"
                        color="primary"                        
                        aria-label={connector.ariaLabel}
                        isDisabled={isExiting}
                        data-test-subj={`nightshiftContextLayerConnector-${connector.id}-connect`}
                        onClick={() => {}}
                      >
                        {i18n.translate(
                          'xpack.observability.nightshift.contextLayerTasks.connect',
                          { defaultMessage: 'Connect' }
                        )}
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>

        {/* ---------- Footer line: connectors + dismiss ---------- */}
        <EuiFlexItem
          grow={false}
          css={css`
            width: 100%;
          `}
        >
          <EuiText size="s" color="subdued" textAlign="center">
            <p>
              <FormattedMessage
                id="xpack.observability.nightshift.contextLayerTasks.footer"
                defaultMessage="Using other apps? {goToConnectors} or {dismiss} this."
                values={{
                  goToConnectors: (
                    <EuiLink
                      data-test-subj="nightshiftContextLayerGoToConnectors"
                      disabled={isExiting}
                      onClick={() => {}}
                    >
                      {i18n.translate(
                        'xpack.observability.nightshift.contextLayerTasks.goToConnectorsLink',
                        { defaultMessage: 'Go to connectors' }
                      )}
                    </EuiLink>
                  ),
                  dismiss: (
                    <EuiLink
                      data-test-subj="nightshiftContextLayerDismiss"
                      disabled={isExiting}
                      onClick={() => setIsDismissed(true)}
                    >
                      {i18n.translate(
                        'xpack.observability.nightshift.contextLayerTasks.dismissLink',
                        { defaultMessage: 'dismiss' }
                      )}
                    </EuiLink>
                  ),
                }}
              />
            </p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
