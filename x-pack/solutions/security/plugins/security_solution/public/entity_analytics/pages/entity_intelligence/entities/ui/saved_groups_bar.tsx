/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFieldText,
  EuiIcon,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { FilterSnapshot, SavedFilterGroup } from '../types';
import { snapshotIsActive, snapshotsEqual } from '../entities_logic';

const I18N_PREFIX = 'xpack.securitySolution.entityAnalytics.intelligence.entities';

export interface SavedGroupsBarProps {
  groups: SavedFilterGroup[];
  currentSnapshot: FilterSnapshot;
  counts: Record<string, number>;
  onApply: (group: SavedFilterGroup) => void;
  onClear: () => void;
  onSave: (name: string) => void;
  onDelete: (id: string) => void;
}

/** The saved filter groups bar: builtin + user presets, apply/clear, + save. */
export const SavedGroupsBar: React.FC<SavedGroupsBarProps> = ({
  groups,
  currentSnapshot,
  counts,
  onApply,
  onClear,
  onSave,
  onDelete,
}) => {
  const { euiTheme } = useEuiTheme();
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const canSave = snapshotIsActive(currentSnapshot);
  const deleteGroupLabel = i18n.translate(`${I18N_PREFIX}.groups.delete`, {
    defaultMessage: 'Delete group',
  });

  // Quiet preset chip: plain text by default, a subtle neutral fill when active.
  const chipStyle = (on: boolean) => css`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 2px 8px;
    border-radius: ${euiTheme.border.radius.small};
    border: none;
    cursor: pointer;
    font-size: 12px;
    line-height: 1.4;
    white-space: nowrap;
    background: ${on ? euiTheme.colors.backgroundBaseSubdued : 'transparent'};
    color: ${on ? euiTheme.colors.textHeading : euiTheme.colors.textSubdued};
    font-weight: ${on ? euiTheme.font.weight.semiBold : euiTheme.font.weight.regular};
    &:hover {
      color: ${euiTheme.colors.textHeading};
      background: ${euiTheme.colors.backgroundBaseSubdued};
    }
  `;

  return (
    <div
      css={css`
        display: flex;
        align-items: center;
        gap: ${euiTheme.size.xs};
        flex-wrap: wrap;
      `}
      data-test-subj="entityIntelligenceEntitiesSavedGroups"
    >
      <EuiText
        size="xs"
        color="subdued"
        css={css`
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-right: ${euiTheme.size.xxs};
        `}
      >
        {i18n.translate(`${I18N_PREFIX}.groups.label`, { defaultMessage: 'Saved views' })}
      </EuiText>

      {groups.map((group) => {
        const on = snapshotsEqual(currentSnapshot, group.snap);
        const count = counts[group.id] ?? 0;
        return (
          <span
            key={group.id}
            css={css`
              display: inline-flex;
              align-items: center;
            `}
          >
            <button
              type="button"
              css={chipStyle(on)}
              onClick={() => (on ? onClear() : onApply(group))}
              data-test-subj={`entityIntelligenceEntitiesGroup-${group.id}`}
            >
              {!group.builtin ? (
                <EuiIcon type="starFilled" size="s" color="subdued" aria-hidden="true" />
              ) : null}
              {group.name}
              <span
                css={css`
                  color: ${euiTheme.colors.textSubdued};
                  font-variant-numeric: tabular-nums;
                  font-weight: ${euiTheme.font.weight.regular};
                `}
              >
                {count}
              </span>
            </button>
            {!group.builtin ? (
              <EuiToolTip disableScreenReaderOutput content={deleteGroupLabel}>
                <EuiButtonIcon
                  iconType="cross"
                  size="xs"
                  color="text"
                  aria-label={deleteGroupLabel}
                  onClick={() => onDelete(group.id)}
                />
              </EuiToolTip>
            ) : null}
          </span>
        );
      })}

      <EuiPopover
        aria-label={i18n.translate(`${I18N_PREFIX}.groups.newTitle`, {
          defaultMessage: 'Save current filters as a group',
        })}
        isOpen={formOpen}
        closePopover={() => setFormOpen(false)}
        panelPaddingSize="m"
        button={
          <EuiButtonEmpty
            size="xs"
            iconType="plusCircle"
            color="text"
            onClick={() => setFormOpen((v) => !v)}
            data-test-subj="entityIntelligenceEntitiesNewGroup"
          >
            {i18n.translate(`${I18N_PREFIX}.groups.new`, { defaultMessage: 'Save view' })}
          </EuiButtonEmpty>
        }
      >
        <div style={{ width: 300 }}>
          <EuiText size="s">
            <strong>
              {i18n.translate(`${I18N_PREFIX}.groups.newTitle`, {
                defaultMessage: 'Save current filters as a group',
              })}
            </strong>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiFieldText
            placeholder={i18n.translate(`${I18N_PREFIX}.groups.namePlaceholder`, {
              defaultMessage: 'Group name…',
            })}
            value={name}
            onChange={(e) => setName(e.target.value)}
            compressed
            fullWidth
            data-test-subj="entityIntelligenceEntitiesGroupName"
          />
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued">
            {canSave
              ? i18n.translate(`${I18N_PREFIX}.groups.saveHint`, {
                  defaultMessage: 'Captures your current filters. Saved per user in this space.',
                })
              : i18n.translate(`${I18N_PREFIX}.groups.noFilters`, {
                  defaultMessage: 'Set some filters first, then save them as a group.',
                })}
          </EuiText>
          <EuiSpacer size="s" />
          <EuiButton
            size="s"
            fill
            fullWidth
            disabled={!canSave}
            onClick={() => {
              onSave(name.trim() || 'Untitled group');
              setName('');
              setFormOpen(false);
            }}
            data-test-subj="entityIntelligenceEntitiesGroupSave"
          >
            {i18n.translate(`${I18N_PREFIX}.groups.save`, { defaultMessage: 'Save group' })}
          </EuiButton>
        </div>
      </EuiPopover>
    </div>
  );
};
