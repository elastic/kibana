/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { useCallback, useMemo, useState } from 'react';
import {
  copyToClipboard,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { useOpenInChat } from '@kbn/agentic-investigations-plugin/public';
import type { InvestigationSummary } from '@kbn/agentic-investigations-plugin/common';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { getFlyoutShareUrlAriaLabel } from '../../ui/flyout_share_url_button';
import { buildNightshiftInvestigationFlyoutShareUrl } from '../../../common/url_params';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../../common/ebt_constants';
import { useKibana } from '../../../hooks/use_kibana';

const copyLinkLabel = i18n.translate('xpack.nightshift.investigations.cardCopyLinkLabel', {
  defaultMessage: 'Copy link',
});

const openInChatLabel = i18n.translate('xpack.nightshift.investigations.cardOpenInChatLabel', {
  defaultMessage: 'Open in chat',
});

const openMenuLabel = i18n.translate('xpack.nightshift.investigations.cardOpenMenuLabel', {
  defaultMessage: 'Open actions menu',
});

export interface InvestigationCardActionsProps {
  investigation: InvestigationSummary;
  /** The assignee avatars and picker, shown before the divider. */
  assignees?: React.ReactNode;
  /** Where the card is shown, for click telemetry. */
  ebtElement?: (typeof NIGHTSHIFT_EBT_ELEMENTS)[keyof typeof NIGHTSHIFT_EBT_ELEMENTS];
}

/**
 * Trailing controls for a Nightshift investigation list card: the assignees, open in chat (same
 * Agent Builder route as the flyout footer) and an overflow menu with Copy link (same share URL /
 * link icon as the investigation flyout menu action).
 */
export const InvestigationCardActions = ({
  investigation,
  assignees,
  ebtElement = NIGHTSHIFT_EBT_ELEMENTS.INVESTIGATIONS_LIST,
}: InvestigationCardActionsProps): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const { notifications } = useKibana().services;
  const { getChatHref, openChat } = useOpenInChat();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const chatHref = getChatHref(investigation.id, investigation.agent_id);
  const handleOpenChat = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
      // The card behind this control is itself clickable.
      event.stopPropagation();
      // Let modified / middle clicks fall through so the href can open in a new tab.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      event.preventDefault();
      openChat(investigation.id, investigation.agent_id);
    },
    [investigation.agent_id, investigation.id, openChat]
  );

  const handleCopyLink = useCallback(() => {
    const copied = copyToClipboard(buildNightshiftInvestigationFlyoutShareUrl(investigation.id));
    if (copied) {
      notifications.toasts.addSuccess({
        // Same confirmation the investigation flyout share action uses.
        title: i18n.translate('xpack.nightshift.flyout.shareUrlSuccess', {
          defaultMessage: 'Copied link to clipboard',
        }),
      });
    }
  }, [investigation.id, notifications.toasts]);

  const menuItems = useMemo(
    () => [
      <EuiContextMenuItem
        key="copyLink"
        icon="link"
        aria-label={getFlyoutShareUrlAriaLabel()}
        onClick={(event) => {
          event.stopPropagation();
          setIsMenuOpen(false);
          handleCopyLink();
        }}
        data-test-subj="nightshiftInvestigationCardCopyLink"
      >
        {copyLinkLabel}
      </EuiContextMenuItem>,
    ],
    [handleCopyLink]
  );

  return (
    <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
      {assignees != null && (
        <EuiFlexItem
          grow={false}
          data-test-subj="nightshiftInvestigationCardAssignees"
          // The list item around the card is tagged "view investigation", which a click here is not.
          {...getEbtProps({
            action: NIGHTSHIFT_EBT_ACTIONS.ASSIGN_INVESTIGATION,
            element: ebtElement,
          })}
        >
          {assignees}
        </EuiFlexItem>
      )}
      <span
        aria-hidden="true"
        css={css({
          width: '1px',
          height: euiTheme.size.base,
          background: euiTheme.colors.backgroundLightText,
          marginLeft: euiTheme.size.s,
          marginRight: euiTheme.size.xs,
        })}
      />
      <EuiFlexItem grow={false}>
        <EuiToolTip content={openInChatLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            size="s"
            color="text"
            iconType="productAgent"
            aria-label={openInChatLabel}
            href={chatHref}
            onClick={handleOpenChat}
            data-test-subj="nightshiftInvestigationCardOpenInChat"
            {...getEbtProps({
              action: NIGHTSHIFT_EBT_ACTIONS.OPEN_IN_CHAT,
              element: ebtElement,
            })}
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPopover
          aria-label={openMenuLabel}
          anchorPosition="downRight"
          panelPaddingSize="none"
          panelStyle={{ minWidth: 220 }}
          isOpen={isMenuOpen}
          closePopover={() => setIsMenuOpen(false)}
          button={
            <EuiToolTip content={openMenuLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                size="s"
                color="text"
                iconType="ellipsis"
                aria-label={openMenuLabel}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                  event.stopPropagation();
                  setIsMenuOpen((open) => !open);
                }}
                data-test-subj="nightshiftInvestigationCardActions"
              />
            </EuiToolTip>
          }
        >
          <EuiContextMenuPanel items={menuItems} />
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
