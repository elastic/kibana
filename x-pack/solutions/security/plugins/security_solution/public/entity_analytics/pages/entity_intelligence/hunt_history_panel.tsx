/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiConfirmModal,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiIcon,
  EuiIconTip,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiButton,
  EuiLoadingSpinner,
  EuiPopover,
  EuiText,
  EuiToolTip,
  transparentize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type {
  HuntListItem,
  HuntSeverity,
} from '../../../../common/entity_analytics/ai_hunt_history/types';
import { SectionLabel } from './components';
import { formatRelativeTime, huntDisplayLabel } from './hunt_history';

const RAIL_WIDTH = 300;
const RAIL_COLLAPSED_WIDTH = 48;

const severityColor = (
  severity: HuntSeverity | undefined
): 'danger' | 'warning' | 'primary' | 'hollow' => {
  if (severity === 'critical') return 'danger';
  if (severity === 'high' || severity === 'medium') return 'warning';
  if (severity === 'low') return 'primary';
  return 'hollow';
};

const RECENT_HUNTS_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.history.title',
  { defaultMessage: 'Recent hunts' }
);

const COLLAPSE_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.history.collapseRail',
  { defaultMessage: 'Collapse recent hunts' }
);

const EXPAND_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.history.expandRail',
  { defaultMessage: 'Show recent hunts' }
);

export interface HuntHistoryRailProps {
  hunts: HuntListItem[];
  isLoading: boolean;
  isError: boolean;
  /** Id of the hunt currently open in the main area (highlighted as active). */
  activeHuntId?: string;
  /** Disables row actions (e.g. while a hunt is generating). */
  disabled?: boolean;
  /** Whether the rail is collapsed to a slim strip. */
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  /**
   * `rail` (default) renders the fixed-width, bordered, collapsible sidebar.
   * `flyout` renders just the scrollable list to fill an overlay drawer on
   * narrow viewports (the drawer supplies its own chrome).
   */
  variant?: 'rail' | 'flyout';
  onReopen: (id: string) => void;
  onRerun: (hunt: HuntListItem) => void;
  onRename: (id: string, name: string | null) => void;
  onTogglePinned: (hunt: HuntListItem) => void;
  onDelete: (id: string) => void;
}

/**
 * "Recent hunts" side rail for the AI Hunt tab — a conversation-history style
 * sidebar rendered alongside the composer/result. Lists persisted hunts
 * (pinned-first, most recent next); selecting one reopens it in the main area
 * (re-renders the saved canvas, no LLM call) and the open hunt is highlighted
 * as active. Each row exposes rerun plus a kebab for rename/pin/delete.
 * Collapsible to a slim strip; sorting is handled upstream by the shared pure
 * helper.
 */
export const HuntHistoryRail: React.FC<HuntHistoryRailProps> = ({
  hunts,
  isLoading,
  isError,
  activeHuntId,
  disabled = false,
  isCollapsed,
  onToggleCollapsed,
  variant = 'rail',
  onReopen,
  onRerun,
  onRename,
  onTogglePinned,
  onDelete,
}) => {
  const { euiTheme } = useEuiTheme();
  const [renameTarget, setRenameTarget] = useState<HuntListItem | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<HuntListItem | undefined>();

  const handleRenameSubmit = useCallback(
    (name: string | null) => {
      if (renameTarget) onRename(renameTarget.id, name);
      setRenameTarget(undefined);
    },
    [renameTarget, onRename]
  );

  const handleDeleteConfirm = useCallback(() => {
    if (deleteTarget) onDelete(deleteTarget.id);
    setDeleteTarget(undefined);
  }, [deleteTarget, onDelete]);

  const isFlyout = variant === 'flyout';

  const railStyle = css`
    display: flex;
    flex-direction: column;
    ${isFlyout
      ? `
    width: 100%;
    height: 100%;
    `
      : `
    width: ${isCollapsed ? RAIL_COLLAPSED_WIDTH : RAIL_WIDTH}px;
    flex: 0 0 ${isCollapsed ? RAIL_COLLAPSED_WIDTH : RAIL_WIDTH}px;
    align-self: stretch;
    border-right: ${euiTheme.border.thin};
    background: ${euiTheme.colors.backgroundBaseSubdued};
    transition: width ${euiTheme.animation.fast} ease, flex-basis ${euiTheme.animation.fast} ease;

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
    `}
  `;
  const headerStyle = css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${euiTheme.size.xs};
    padding: ${euiTheme.size.s} ${euiTheme.size.s} ${euiTheme.size.s} ${euiTheme.size.m};
    min-height: ${euiTheme.size.xxl};
    border-bottom: ${euiTheme.border.thin};
  `;
  const listStyle = css`
    display: flex;
    flex-direction: column;
    gap: ${euiTheme.size.s};
    padding: ${euiTheme.size.s};
    overflow-y: auto;
    min-height: 0;
  `;
  const collapsedStripStyle = css`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: ${euiTheme.size.s};
    padding: ${euiTheme.size.s} 0;
  `;

  if (isCollapsed) {
    return (
      <div css={railStyle} data-test-subj="entityIntelligenceHuntHistoryRail">
        <div css={collapsedStripStyle}>
          <EuiToolTip content={EXPAND_LABEL} position="right" disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="menuRight"
              display="base"
              onClick={onToggleCollapsed}
              aria-label={EXPAND_LABEL}
              data-test-subj="entityIntelligenceHuntHistoryExpand"
            />
          </EuiToolTip>
          <EuiIconTip type="clock" color="subdued" content={RECENT_HUNTS_TITLE} position="right" />
          {!isError && hunts.length > 0 ? <EuiBadge color="hollow">{hunts.length}</EuiBadge> : null}
        </div>
      </div>
    );
  }

  return (
    <div css={railStyle} data-test-subj="entityIntelligenceHuntHistoryRail">
      {!isFlyout ? (
        <div css={headerStyle}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="clock" color="subdued" aria-hidden={true} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <SectionLabel>{RECENT_HUNTS_TITLE}</SectionLabel>
            </EuiFlexItem>
            {!isError && hunts.length > 0 ? (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  <span>{hunts.length}</span>
                </EuiText>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
          <EuiToolTip content={COLLAPSE_LABEL} position="left" disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="menuLeft"
              onClick={onToggleCollapsed}
              aria-label={COLLAPSE_LABEL}
              data-test-subj="entityIntelligenceHuntHistoryCollapse"
            />
          </EuiToolTip>
        </div>
      ) : null}

      {isError ? (
        <div css={listStyle}>
          <EuiText size="s" color="subdued" data-test-subj="entityIntelligenceHuntHistoryError">
            <p>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.history.loadError',
                { defaultMessage: 'Unable to load recent hunts.' }
              )}
            </p>
          </EuiText>
        </div>
      ) : isLoading && hunts.length === 0 ? (
        <div css={listStyle} data-test-subj="entityIntelligenceHuntHistoryLoading">
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="s" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                <span>
                  {i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.history.loading',
                    { defaultMessage: 'Loading recent hunts…' }
                  )}
                </span>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      ) : hunts.length === 0 ? (
        <div css={listStyle}>
          <EuiText
            size="s"
            color="subdued"
            data-test-subj="entityIntelligenceHuntHistoryEmpty"
            css={css`
              padding: ${euiTheme.size.m};
              text-align: center;
            `}
          >
            <p>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.history.emptyState',
                { defaultMessage: 'No hunts yet — run one to see it here.' }
              )}
            </p>
          </EuiText>
        </div>
      ) : (
        <div css={listStyle}>
          {hunts.map((hunt) => (
            <HuntHistoryRailItem
              key={hunt.id}
              hunt={hunt}
              isActive={hunt.id === activeHuntId}
              disabled={disabled}
              onReopen={onReopen}
              onRerun={onRerun}
              onTogglePinned={onTogglePinned}
              onRequestRename={setRenameTarget}
              onRequestDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {renameTarget ? (
        <RenameHuntModal
          hunt={renameTarget}
          onCancel={() => setRenameTarget(undefined)}
          onSubmit={handleRenameSubmit}
        />
      ) : null}

      {deleteTarget ? (
        <EuiConfirmModal
          aria-label={i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.history.deleteTitle',
            { defaultMessage: 'Delete this hunt?' }
          )}
          title={i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.history.deleteTitle',
            { defaultMessage: 'Delete this hunt?' }
          )}
          onCancel={() => setDeleteTarget(undefined)}
          onConfirm={handleDeleteConfirm}
          cancelButtonText={i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.history.deleteCancel',
            { defaultMessage: 'Cancel' }
          )}
          confirmButtonText={i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.history.deleteConfirm',
            { defaultMessage: 'Delete' }
          )}
          buttonColor="danger"
          data-test-subj="entityIntelligenceHuntHistoryDeleteModal"
        >
          <p>
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.history.deleteBody',
              {
                defaultMessage:
                  'The saved result for "{label}" will be permanently removed. This cannot be undone.',
                values: { label: huntDisplayLabel(deleteTarget) },
              }
            )}
          </p>
        </EuiConfirmModal>
      ) : null}
    </div>
  );
};

interface HuntHistoryRailItemProps {
  hunt: HuntListItem;
  isActive: boolean;
  disabled: boolean;
  onReopen: (id: string) => void;
  onRerun: (hunt: HuntListItem) => void;
  onTogglePinned: (hunt: HuntListItem) => void;
  onRequestRename: (hunt: HuntListItem) => void;
  onRequestDelete: (hunt: HuntListItem) => void;
}

const HuntHistoryRailItem: React.FC<HuntHistoryRailItemProps> = ({
  hunt,
  isActive,
  disabled,
  onReopen,
  onRerun,
  onTogglePinned,
  onRequestRename,
  onRequestDelete,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const itemStyle = css`
    position: relative;
    border: ${euiTheme.border.width.thin} solid
      ${isActive ? euiTheme.colors.primary : euiTheme.colors.borderBasePlain};
    border-radius: ${euiTheme.border.radius.medium};
    background: ${isActive
      ? transparentize(euiTheme.colors.primary, 0.12)
      : euiTheme.colors.emptyShade};
    padding: ${euiTheme.size.s};
    transition: border-color ${euiTheme.animation.fast} ease,
      background-color ${euiTheme.animation.fast} ease;

    &:hover {
      border-color: ${euiTheme.colors.primary};
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `;
  const activeBarStyle = css`
    position: absolute;
    inset: 0 auto 0 0;
    width: ${euiTheme.size.xxs};
    border-radius: ${euiTheme.border.radius.medium} 0 0 ${euiTheme.border.radius.medium};
    background: ${euiTheme.colors.primary};
  `;
  const labelButtonStyle = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.xs};
    width: 100%;
    min-width: 0;
    text-align: left;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: ${euiTheme.colors.textParagraph};
    font-weight: ${euiTheme.font.weight.semiBold};

    &:hover {
      color: ${euiTheme.colors.primaryText};
    }
  `;
  const labelTextStyle = css`
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `;
  const metaStyle = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.xs};
    flex-wrap: wrap;
    margin-top: ${euiTheme.size.xs};
  `;
  const footerStyle = css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${euiTheme.size.xs};
    margin-top: ${euiTheme.size.xs};
  `;

  const closeMenu = useCallback(() => setIsMenuOpen(false), []);
  const label = huntDisplayLabel(hunt);
  const pinLabel = hunt.pinned
    ? i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.aiHunt.history.unpin', {
        defaultMessage: 'Unpin',
      })
    : i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.aiHunt.history.pin', {
        defaultMessage: 'Pin',
      });

  return (
    <div
      css={itemStyle}
      data-test-subj="entityIntelligenceHuntHistoryRow"
      aria-current={isActive ? 'true' : undefined}
    >
      {isActive ? (
        <span css={activeBarStyle} data-test-subj="entityIntelligenceHuntHistoryActiveIndicator" />
      ) : null}
      <button
        type="button"
        css={labelButtonStyle}
        onClick={() => onReopen(hunt.id)}
        disabled={disabled}
        title={label}
        data-test-subj="entityIntelligenceHuntHistoryReopen"
      >
        {hunt.pinned ? (
          <EuiIcon
            type="pinFilled"
            size="s"
            color="primary"
            data-test-subj="entityIntelligenceHuntHistoryPinnedIcon"
            aria-hidden={true}
          />
        ) : null}
        <span css={labelTextStyle}>{label}</span>
      </button>

      <div css={metaStyle}>
        <EuiText size="xs" color="subdued">
          <span>{formatRelativeTime(hunt.updatedAt)}</span>
        </EuiText>
        {hunt.status === 'error' ? (
          <EuiBadge color="danger">
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.history.errorBadge',
              { defaultMessage: 'Error' }
            )}
          </EuiBadge>
        ) : hunt.status === 'partial' || hunt.status === 'running' ? (
          <EuiBadge color="warning">
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.history.partialBadge',
              { defaultMessage: 'Incomplete' }
            )}
          </EuiBadge>
        ) : hunt.summary.severity ? (
          <EuiBadge color={severityColor(hunt.summary.severity)}>
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.history.severityBadge',
              {
                defaultMessage: '{severity} priority',
                values: { severity: hunt.summary.severity },
              }
            )}
          </EuiBadge>
        ) : null}
        {hunt.summary.findingCount > 0 ? (
          <EuiText size="xs" color="subdued">
            <span>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.history.findingCount',
                {
                  defaultMessage: '{count, plural, one {# finding} other {# findings}}',
                  values: { count: hunt.summary.findingCount },
                }
              )}
            </span>
          </EuiText>
        ) : null}
      </div>

      <div css={footerStyle}>
        <EuiButtonEmpty
          size="xs"
          flush="left"
          iconType="refresh"
          onClick={() => onRerun(hunt)}
          disabled={disabled}
          data-test-subj="entityIntelligenceHuntHistoryRerun"
        >
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.history.rerun',
            { defaultMessage: 'Rerun' }
          )}
        </EuiButtonEmpty>
        <EuiPopover
          aria-label={i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.history.actionsAriaLabel',
            { defaultMessage: 'Hunt actions' }
          )}
          isOpen={isMenuOpen}
          closePopover={closeMenu}
          panelPaddingSize="none"
          anchorPosition="downRight"
          button={
            <EuiToolTip
              content={i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.history.actionsAriaLabel',
                { defaultMessage: 'Hunt actions' }
              )}
              disableScreenReaderOutput
            >
              <EuiButtonIcon
                iconType="boxesVertical"
                size="xs"
                color="text"
                onClick={() => setIsMenuOpen((open) => !open)}
                aria-label={i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.history.actionsAriaLabel',
                  { defaultMessage: 'Hunt actions' }
                )}
                data-test-subj="entityIntelligenceHuntHistoryActions"
              />
            </EuiToolTip>
          }
        >
          <EuiContextMenuPanel
            items={[
              <EuiContextMenuItem
                key="pin"
                icon={hunt.pinned ? 'pinFilled' : 'pin'}
                onClick={() => {
                  closeMenu();
                  onTogglePinned(hunt);
                }}
                data-test-subj="entityIntelligenceHuntHistoryTogglePin"
              >
                {pinLabel}
              </EuiContextMenuItem>,
              <EuiContextMenuItem
                key="rename"
                icon="pencil"
                onClick={() => {
                  closeMenu();
                  onRequestRename(hunt);
                }}
                data-test-subj="entityIntelligenceHuntHistoryRename"
              >
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.history.rename',
                  { defaultMessage: 'Rename' }
                )}
              </EuiContextMenuItem>,
              <EuiContextMenuItem
                key="delete"
                icon="trash"
                onClick={() => {
                  closeMenu();
                  onRequestDelete(hunt);
                }}
                data-test-subj="entityIntelligenceHuntHistoryDelete"
              >
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.history.delete',
                  { defaultMessage: 'Delete' }
                )}
              </EuiContextMenuItem>,
            ]}
          />
        </EuiPopover>
      </div>
    </div>
  );
};

interface RenameHuntModalProps {
  hunt: HuntListItem;
  onCancel: () => void;
  onSubmit: (name: string | null) => void;
}

const RenameHuntModal: React.FC<RenameHuntModalProps> = ({ hunt, onCancel, onSubmit }) => {
  const [value, setValue] = useState(hunt.name ?? '');
  const modalTitleId = `renameHunt-${hunt.id}`;

  const submit = useCallback(() => {
    const trimmed = value.trim();
    onSubmit(trimmed === '' ? null : trimmed);
  }, [value, onSubmit]);

  return (
    <EuiModal
      onClose={onCancel}
      aria-labelledby={modalTitleId}
      data-test-subj="entityIntelligenceHuntHistoryRenameModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.history.renameTitle',
            { defaultMessage: 'Rename hunt' }
          )}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiForm
          component="form"
          onSubmit={(event: React.FormEvent) => {
            event.preventDefault();
            submit();
          }}
        >
          <EuiFormRow
            label={i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.history.renameLabel',
              { defaultMessage: 'Name' }
            )}
            helpText={i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.history.renameHelp',
              { defaultMessage: 'Leave blank to fall back to the hunt question.' }
            )}
          >
            <EuiFieldText
              value={value}
              onChange={(event) => setValue(event.target.value)}
              autoFocus
              data-test-subj="entityIntelligenceHuntHistoryRenameInput"
            />
          </EuiFormRow>
        </EuiForm>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCancel}>
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.history.renameCancel',
            { defaultMessage: 'Cancel' }
          )}
        </EuiButtonEmpty>
        <EuiButton fill onClick={submit} data-test-subj="entityIntelligenceHuntHistoryRenameSubmit">
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.history.renameSave',
            { defaultMessage: 'Save' }
          )}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
