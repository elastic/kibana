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
  EuiConfirmModal,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPopover,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { useOpenInChat } from '@kbn/agentic-investigations-plugin/public';
import type { InvestigationSummary } from '@kbn/agentic-investigations-plugin/common';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { useQueryClient } from '@kbn/react-query';
import { getFlyoutShareUrlAriaLabel } from '../../ui/flyout_share_url_button';
import { buildNightshiftInvestigationFlyoutShareUrl } from '../../../common/url_params';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../../common/ebt_constants';
import { NIGHTSHIFT_INVESTIGATIONS_QUERY_KEY } from '../../../data/investigations/use_fetch_investigations';
import { useKibana } from '../../../hooks/use_kibana';

/** Investigations are Agent Builder conversations; this public API deletes one. */
const AGENT_BUILDER_CONVERSATIONS_URL = '/api/agent_builder/conversations';
const AGENT_BUILDER_PUBLIC_API_VERSION = '2023-10-31';

const copyLinkLabel = i18n.translate('xpack.nightshift.investigations.cardCopyLinkLabel', {
  defaultMessage: 'Copy link',
});

const deleteLabel = i18n.translate('xpack.nightshift.investigations.cardDeleteLabel', {
  defaultMessage: 'Delete',
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
 * link icon as the investigation flyout menu action) and, for Agent Builder admins, Delete.
 */
export const InvestigationCardActions = ({
  investigation,
  assignees,
  ebtElement = NIGHTSHIFT_EBT_ELEMENTS.INVESTIGATIONS_LIST,
}: InvestigationCardActionsProps): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const { application, http, notifications } = useKibana().services;
  const queryClient = useQueryClient();
  // Investigations are public conversations owned by the Nightshift service account, which Agent
  // Builder lets only its admins delete.
  const canDelete = Boolean(application.capabilities.agentBuilder?.isAdmin);
  const { getChatHref, openChat } = useOpenInChat();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const deleteConfirmTitleId = useGeneratedHtmlId({ prefix: 'nightshiftDeleteInvestigation' });

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

  const handleDelete = useCallback(async () => {
    setIsDeleteConfirmOpen(false);
    try {
      await http.delete(
        `${AGENT_BUILDER_CONVERSATIONS_URL}/${encodeURIComponent(investigation.id)}`,
        { version: AGENT_BUILDER_PUBLIC_API_VERSION }
      );
      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.nightshift.investigations.cardDeleteSuccess', {
          defaultMessage: 'Investigation deleted',
        }),
      });
    } catch (error) {
      notifications.toasts.addError(error as Error, {
        title: i18n.translate('xpack.nightshift.investigations.cardDeleteError', {
          defaultMessage: 'Could not delete the investigation',
        }),
      });
    } finally {
      // Covers the home page sections, their severity counts, and the onboarding trial investigation.
      void queryClient.invalidateQueries({ queryKey: NIGHTSHIFT_INVESTIGATIONS_QUERY_KEY });
    }
  }, [http, investigation.id, notifications.toasts, queryClient]);

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
      ...(canDelete
        ? [
            <EuiHorizontalRule key="deleteSeparator" margin="none" />,
            <EuiContextMenuItem
              key="delete"
              icon="trash"
              color="danger"
              onClick={(event) => {
                event.stopPropagation();
                setIsMenuOpen(false);
                setIsDeleteConfirmOpen(true);
              }}
              data-test-subj="nightshiftInvestigationCardDelete"
              {...getEbtProps({
                action: NIGHTSHIFT_EBT_ACTIONS.DELETE_INVESTIGATION,
                element: ebtElement,
              })}
            >
              {deleteLabel}
            </EuiContextMenuItem>,
          ]
        : []),
    ],
    [canDelete, ebtElement, handleCopyLink]
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
        {isDeleteConfirmOpen && (
          // React events bubble through the modal's portal to the clickable card behind it.
          <div onClick={(event) => event.stopPropagation()} role="presentation">
            <EuiConfirmModal
              aria-labelledby={deleteConfirmTitleId}
              titleProps={{ id: deleteConfirmTitleId }}
              title={i18n.translate('xpack.nightshift.investigations.cardDeleteConfirmTitle', {
                defaultMessage: 'Delete investigation?',
              })}
              onCancel={() => setIsDeleteConfirmOpen(false)}
              onConfirm={handleDelete}
              cancelButtonText={i18n.translate('xpack.nightshift.investigations.cardDeleteCancel', {
                defaultMessage: 'Cancel',
              })}
              confirmButtonText={deleteLabel}
              buttonColor="danger"
              defaultFocusedButton="cancel"
              data-test-subj="nightshiftInvestigationCardDeleteConfirm"
            >
              <EuiText size="s">
                <p>
                  {i18n.translate('xpack.nightshift.investigations.cardDeleteConfirmBody', {
                    defaultMessage:
                      '"{title}" and its conversation will be permanently deleted. This cannot be undone.',
                    values: { title: investigation.title },
                  })}
                </p>
              </EuiText>
            </EuiConfirmModal>
          </div>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
