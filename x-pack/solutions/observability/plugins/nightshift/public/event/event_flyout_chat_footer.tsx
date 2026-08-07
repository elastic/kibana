/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPopover,
  EuiToolTip,
  useEuiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import type { InvestigationStatus } from '@kbn/investigation-output';
import type {
  SignificantEvent,
  SignificantEventInvestigation,
} from '@kbn/significant-events-schema';
import { AiButton } from '@kbn/shared-ux-ai-components';
import { useKibana } from '../hooks/use_kibana';
import {
  buildInvestigationConversationChatOptions,
  buildNewSignificantEventChatOptions,
} from '../chat/open_significant_event_in_chat';
import {
  NIGHTSHIFT_EBT_ACTIONS,
  NIGHTSHIFT_EBT_DETAILS,
  NIGHTSHIFT_EBT_ELEMENTS,
} from '../common/ebt_constants';

const INVESTIGATION_MENU_TITLE_MAX_LENGTH = 48;

const truncateForMenu = (text: string): string =>
  text.length <= INVESTIGATION_MENU_TITLE_MAX_LENGTH
    ? text
    : `${text.slice(0, INVESTIGATION_MENU_TITLE_MAX_LENGTH - 1)}…`;

export interface EventFlyoutChatFooterProps {
  event: SignificantEvent;
  investigation: SignificantEventInvestigation;
  conversationId?: string;
  status: InvestigationStatus;
}

export function EventFlyoutChatFooter({
  event,
  investigation,
  conversationId,
  status,
}: EventFlyoutChatFooterProps): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const investigationsMenuTitleFont = useEuiFontSize('xs');
  const { agentBuilder } = useKibana().services;
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const latestInvestigationInProgress = investigation.completed_at == null && status !== 'complete';

  const showChatMenu = !latestInvestigationInProgress;

  const closeMenu = useCallback(() => setIsMenuOpen(false), []);

  const openNewChat = useCallback(() => {
    closeMenu();
    agentBuilder?.openChat(buildNewSignificantEventChatOptions(event));
  }, [agentBuilder, closeMenu, event]);

  const openInvestigationChat = useCallback(() => {
    if (!conversationId) {
      return;
    }
    closeMenu();
    agentBuilder?.openChat(buildInvestigationConversationChatOptions(conversationId));
  }, [agentBuilder, closeMenu, conversationId]);

  const inProgressTooltip = latestInvestigationInProgress
    ? i18n.translate('xpack.nightshift.flyout.openInChatInProgressTooltip', {
        defaultMessage:
          'An investigation is still running. You can start a new chat about this significant event.',
      })
    : undefined;

  const openInChatLabel = i18n.translate('xpack.nightshift.flyout.openInChatButtonLabel', {
    defaultMessage: 'Open in chat',
  });

  const newChatItemLabel = i18n.translate('xpack.nightshift.flyout.openInChatNewConversationItem', {
    defaultMessage: 'New chat about this event',
  });

  const investigationMenuItemLabel = truncateForMenu(event.title);

  const investigationChatUnavailableLabel = i18n.translate(
    'xpack.nightshift.flyout.openInChatInvestigationUnavailable',
    {
      defaultMessage: 'Investigation chat is still loading',
    }
  );

  const menuAriaLabel = i18n.translate('xpack.nightshift.flyout.openInChatMenuAriaLabel', {
    defaultMessage: 'Open in chat options',
  });

  const investigationsMenuTitle = i18n.translate(
    'xpack.nightshift.flyout.openInChatInvestigationsMenuTitle',
    {
      defaultMessage: 'Investigations',
    }
  );

  const menuPanel = (
    <EuiContextMenuPanel
      data-test-subj="nightshiftEventFlyoutChatMenuPanel"
      title={investigationsMenuTitle}
      css={css`
        .euiContextMenuPanelTitle {
          ${investigationsMenuTitleFont}
          font-weight: ${euiTheme.font.weight.semiBold};
        }
      `}
    >
      <EuiContextMenuItem
        data-test-subj="nightshiftEventFlyoutOpenInvestigationChatItem"
        disabled={!conversationId}
        icon="discuss"
        onClick={openInvestigationChat}
        toolTipContent={conversationId ? undefined : investigationChatUnavailableLabel}
        {...getEbtProps({
          action: NIGHTSHIFT_EBT_ACTIONS.OPEN_IN_CHAT,
          element: NIGHTSHIFT_EBT_ELEMENTS.EVENT_FLYOUT,
          detail: NIGHTSHIFT_EBT_DETAILS.EXISTING_CONVERSATION,
        })}
      >
        {investigationMenuItemLabel}
      </EuiContextMenuItem>
      <EuiHorizontalRule margin="none" />
      <EuiContextMenuItem
        data-test-subj="nightshiftEventFlyoutStartNewChatItem"
        icon="productAgent"
        onClick={openNewChat}
        {...getEbtProps({
          action: NIGHTSHIFT_EBT_ACTIONS.OPEN_IN_CHAT,
          element: NIGHTSHIFT_EBT_ELEMENTS.EVENT_FLYOUT,
          detail: NIGHTSHIFT_EBT_DETAILS.NEW_CONVERSATION,
        })}
      >
        {newChatItemLabel}
      </EuiContextMenuItem>
    </EuiContextMenuPanel>
  );

  const button = showChatMenu ? (
    <EuiPopover
      aria-label={menuAriaLabel}
      isOpen={isMenuOpen}
      closePopover={closeMenu}
      panelPaddingSize="none"
      anchorPosition="upRight"
      button={
        <AiButton
          variant="base"
          size="s"
          data-test-subj="nightshiftEventFlyoutChatButton"
          aria-label={menuAriaLabel}
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          <span
            css={css`
              align-items: center;
              display: inline-flex;
            `}
          >
            {openInChatLabel}
            <EuiIcon
              css={css`
                margin-left: ${euiTheme.size.m};
              `}
              type="arrowDown"
              size="s"
              aria-hidden="true"
            />
          </span>
        </AiButton>
      }
    >
      {menuPanel}
    </EuiPopover>
  ) : (
    <AiButton
      variant="base"
      size="s"
      iconType="productAgent"
      data-test-subj="nightshiftEventFlyoutChatButton"
      onClick={openNewChat}
      {...getEbtProps({
        action: NIGHTSHIFT_EBT_ACTIONS.OPEN_IN_CHAT,
        element: NIGHTSHIFT_EBT_ELEMENTS.EVENT_FLYOUT,
        detail: NIGHTSHIFT_EBT_DETAILS.NEW_CONVERSATION,
      })}
    >
      {openInChatLabel}
    </AiButton>
  );

  return (
    <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
      <EuiFlexItem grow={false}>
        {inProgressTooltip ? (
          <EuiToolTip content={inProgressTooltip}>
            <span tabIndex={0}>{button}</span>
          </EuiToolTip>
        ) : (
          button
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
