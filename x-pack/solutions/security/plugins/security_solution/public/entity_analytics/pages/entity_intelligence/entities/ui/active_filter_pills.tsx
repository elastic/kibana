/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiButtonEmpty, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { FilterSnapshot, TriageTileKey } from '../types';
import { snapshotIsActive } from '../entities_logic';
import { criticalityLabel } from '../presentation';

const I18N_PREFIX = 'xpack.securitySolution.entityAnalytics.intelligence.entities';

const TILE_LABEL: Record<TriageTileKey, string> = {
  highrisk: i18n.translate(`${I18N_PREFIX}.pill.highRisk`, { defaultMessage: 'High-risk' }),
  untriaged: i18n.translate(`${I18N_PREFIX}.pill.untriaged`, {
    defaultMessage: 'Untriaged high-risk',
  }),
  firsthigh: i18n.translate(`${I18N_PREFIX}.pill.firstHigh`, {
    defaultMessage: 'First-time High/Critical',
  }),
  newrule: i18n.translate(`${I18N_PREFIX}.pill.newRule`, { defaultMessage: 'New rule for entity' }),
  newalerted: i18n.translate(`${I18N_PREFIX}.pill.newAlerted`, {
    defaultMessage: 'New · alerting',
  }),
  watchlisted: i18n.translate(`${I18N_PREFIX}.pill.watchlisted`, { defaultMessage: 'Watchlisted' }),
};

export interface ActiveFilterPillsProps {
  snapshot: FilterSnapshot;
  onClearAll: () => void;
  onClearTile: () => void;
  onClearRule: () => void;
  onClearCase: () => void;
  onClearAttack: () => void;
  caseTitleById: Map<string, string>;
  attackTitleById: Map<string, string>;
}

/** Active-filter summary pills with per-pill and clear-all actions. */
export const ActiveFilterPills: React.FC<ActiveFilterPillsProps> = ({
  snapshot,
  onClearAll,
  onClearTile,
  onClearRule,
  onClearCase,
  onClearAttack,
  caseTitleById,
  attackTitleById,
}) => {
  const { euiTheme } = useEuiTheme();

  if (!snapshotIsActive(snapshot)) return null;

  return (
    <div
      css={css`
        display: flex;
        align-items: center;
        gap: ${euiTheme.size.xs};
        flex-wrap: wrap;
      `}
      data-test-subj="entityIntelligenceEntitiesActivePills"
    >
      <EuiText
        size="xs"
        color="subdued"
        css={css`
          text-transform: uppercase;
          letter-spacing: 0.04em;
          font-weight: ${euiTheme.font.weight.semiBold};
          margin-right: ${euiTheme.size.xxs};
        `}
      >
        {i18n.translate(`${I18N_PREFIX}.pill.activeLabel`, { defaultMessage: 'Active' })}
      </EuiText>
      {snapshot.tileFilter ? (
        <EuiBadge
          color="primary"
          iconType="cross"
          iconSide="right"
          iconOnClick={onClearTile}
          iconOnClickAriaLabel={i18n.translate(`${I18N_PREFIX}.pill.clearTile`, {
            defaultMessage: 'Clear tile filter',
          })}
        >
          {TILE_LABEL[snapshot.tileFilter]}
        </EuiBadge>
      ) : null}
      {snapshot.rule ? (
        <EuiBadge
          color="hollow"
          iconType="cross"
          iconSide="right"
          iconOnClick={onClearRule}
          iconOnClickAriaLabel={i18n.translate(`${I18N_PREFIX}.pill.clearRule`, {
            defaultMessage: 'Clear rule filter',
          })}
        >
          {i18n.translate(`${I18N_PREFIX}.pill.rule`, {
            defaultMessage: 'Rule: {rule}',
            values: { rule: snapshot.rule },
          })}
        </EuiBadge>
      ) : null}
      {snapshot.caseId ? (
        <EuiBadge
          color="hollow"
          iconType="cross"
          iconSide="right"
          iconOnClick={onClearCase}
          iconOnClickAriaLabel={i18n.translate(`${I18N_PREFIX}.pill.clearCase`, {
            defaultMessage: 'Clear case filter',
          })}
        >
          {i18n.translate(`${I18N_PREFIX}.pill.case`, {
            defaultMessage: 'Case: {title}',
            values: { title: caseTitleById.get(snapshot.caseId) ?? snapshot.caseId },
          })}
        </EuiBadge>
      ) : null}
      {snapshot.attackId ? (
        <EuiBadge
          color="hollow"
          iconType="cross"
          iconSide="right"
          iconOnClick={onClearAttack}
          iconOnClickAriaLabel={i18n.translate(`${I18N_PREFIX}.pill.clearAttack`, {
            defaultMessage: 'Clear attack filter',
          })}
        >
          {i18n.translate(`${I18N_PREFIX}.pill.attack`, {
            defaultMessage: 'Attack: {title}',
            values: { title: attackTitleById.get(snapshot.attackId) ?? snapshot.attackId },
          })}
        </EuiBadge>
      ) : null}
      {snapshot.crits.map((c) => (
        <EuiBadge key={c} color="hollow">
          {criticalityLabel(c)}
        </EuiBadge>
      ))}
      <EuiButtonEmpty
        size="xs"
        iconType="cross"
        flush="both"
        onClick={onClearAll}
        css={css`
          margin-left: ${euiTheme.size.xxs};
        `}
        data-test-subj="entityIntelligenceEntitiesClearFilters"
      >
        {i18n.translate(`${I18N_PREFIX}.pill.clearAll`, { defaultMessage: 'Clear all' })}
      </EuiButtonEmpty>
    </div>
  );
};
