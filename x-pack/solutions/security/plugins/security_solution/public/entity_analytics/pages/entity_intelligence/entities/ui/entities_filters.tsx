/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiPopover,
  EuiSelectable,
  EuiSpacer,
  EuiButtonGroup,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { RiskLevel } from '../../common';
import { RISK_LEVELS } from '../../common';
import type { EntityTypeFilter, FilterSnapshot, RiskTrendFilter } from '../types';
import { WATCHLIST_ANY, WATCHLIST_NONE } from '../types';
import { CRIT_RANK } from '../entities_logic';
import { criticalityLabel } from '../presentation';
import type { CaseFilterOption } from '../../hooks/use_entity_cases';
import type { AttackFilterOption } from '../../hooks/use_entity_attacks';

const I18N_PREFIX = 'xpack.securitySolution.entityAnalytics.intelligence.entities';

export interface RuleFilterOption {
  ruleName: string;
  entityCount: number;
}

export interface EntitiesFiltersProps {
  snapshot: FilterSnapshot;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onTypeChange: (type: EntityTypeFilter) => void;
  onLevelsChange: (levels: RiskLevel[]) => void;
  onCritsChange: (crits: string[]) => void;
  onTrendChange: (trend: RiskTrendFilter) => void;
  onRuleChange: (rule: string | null) => void;
  onWatchlistsChange: (watchlists: string[]) => void;
  onCaseChange: (caseId: string | null) => void;
  onAttackChange: (attackId: string | null) => void;
  watchlistNames: string[];
  rules: RuleFilterOption[];
  caseOptions: CaseFilterOption[];
  attackOptions: AttackFilterOption[];
}

const CRIT_KEYS = Object.keys(CRIT_RANK).sort((a, b) => CRIT_RANK[b] - CRIT_RANK[a]);

const TYPE_OPTIONS: Array<{ id: EntityTypeFilter; label: string }> = [
  { id: 'all', label: i18n.translate(`${I18N_PREFIX}.type.all`, { defaultMessage: 'All' }) },
  { id: 'user', label: i18n.translate(`${I18N_PREFIX}.type.users`, { defaultMessage: 'Users' }) },
  {
    id: 'service',
    label: i18n.translate(`${I18N_PREFIX}.type.services`, { defaultMessage: 'Services' }),
  },
  { id: 'host', label: i18n.translate(`${I18N_PREFIX}.type.hosts`, { defaultMessage: 'Hosts' }) },
];

const TREND_OPTIONS: Array<{ id: RiskTrendFilter; label: string }> = [
  { id: 'any', label: i18n.translate(`${I18N_PREFIX}.trend.any`, { defaultMessage: 'Any' }) },
  {
    id: 'up',
    label: i18n.translate(`${I18N_PREFIX}.trend.rising`, { defaultMessage: 'Rising ▲' }),
  },
  {
    id: 'down',
    label: i18n.translate(`${I18N_PREFIX}.trend.falling`, { defaultMessage: 'Falling ▼' }),
  },
];

/** A popover-backed multi-select filter (risk level / criticality / watchlist). */
const MultiSelectFilter: React.FC<{
  label: string;
  selected: string[];
  options: Array<{ key: string; label: string }>;
  onChange: (selected: string[]) => void;
  dataTestSubj: string;
}> = ({ label, selected, options, onChange, dataTestSubj }) => {
  const [open, setOpen] = useState(false);
  const selectableOptions: EuiSelectableOption[] = options.map((o) => ({
    label: o.label,
    key: o.key,
    checked: selected.includes(o.key) ? 'on' : undefined,
  }));

  return (
    <EuiPopover
      aria-label={label}
      isOpen={open}
      closePopover={() => setOpen(false)}
      panelPaddingSize="none"
      button={
        <EuiFilterButton
          iconType="chevronSingleDown"
          onClick={() => setOpen((v) => !v)}
          isSelected={open}
          numFilters={options.length}
          hasActiveFilters={selected.length > 0}
          numActiveFilters={selected.length}
          data-test-subj={dataTestSubj}
        >
          {label}
        </EuiFilterButton>
      }
    >
      <EuiSelectable
        options={selectableOptions}
        onChange={(next) =>
          onChange(next.filter((o) => o.checked === 'on').map((o) => o.key as string))
        }
        searchable={options.length > 8}
        singleSelection={false}
        listProps={{ bordered: false }}
      >
        {(list, search) => (
          <div style={{ width: 260 }}>
            {search}
            {list}
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};

/** A popover-backed single-select filter (rule / case / attack pivots). */
const SingleSelectFilter: React.FC<{
  label: string;
  selectedId: string | null;
  options: Array<{ id: string; label: string; count: number }>;
  onChange: (id: string | null) => void;
  dataTestSubj: string;
  emptyMessage: string;
}> = ({ label, selectedId, options, onChange, dataTestSubj, emptyMessage }) => {
  const [open, setOpen] = useState(false);
  const selectableOptions: EuiSelectableOption[] = options.map((o) => ({
    label: o.label,
    key: o.id,
    checked: selectedId === o.id ? 'on' : undefined,
    append: String(o.count),
  }));

  return (
    <EuiPopover
      aria-label={label}
      isOpen={open}
      closePopover={() => setOpen(false)}
      panelPaddingSize="none"
      button={
        <EuiFilterButton
          iconType="chevronSingleDown"
          onClick={() => setOpen((v) => !v)}
          isSelected={open}
          hasActiveFilters={selectedId !== null}
          numActiveFilters={selectedId !== null ? 1 : 0}
          data-test-subj={dataTestSubj}
        >
          {label}
        </EuiFilterButton>
      }
    >
      <div style={{ width: 340 }}>
        <EuiSelectable
          options={selectableOptions}
          singleSelection
          searchable
          onChange={(next) => {
            const picked = next.find((o) => o.checked === 'on');
            onChange(picked ? (picked.key as string) : null);
            setOpen(false);
          }}
          listProps={{ bordered: false, textWrap: 'truncate' }}
          emptyMessage={emptyMessage}
        >
          {(list, search) => (
            <>
              {search}
              {list}
            </>
          )}
        </EuiSelectable>
        {selectedId !== null ? (
          <>
            <EuiSpacer size="xs" />
            <EuiButtonEmpty
              size="xs"
              iconType="cross"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              {i18n.translate(`${I18N_PREFIX}.filters.clearSelection`, {
                defaultMessage: 'Clear selection',
              })}
            </EuiButtonEmpty>
          </>
        ) : null}
      </div>
    </EuiPopover>
  );
};

/** The full filter toolbar: search, type, and every pivot popover. */
export const EntitiesFilters: React.FC<EntitiesFiltersProps> = ({
  snapshot,
  searchValue,
  onSearchChange,
  onTypeChange,
  onLevelsChange,
  onCritsChange,
  onTrendChange,
  onRuleChange,
  onWatchlistsChange,
  onCaseChange,
  onAttackChange,
  watchlistNames,
  rules,
  caseOptions,
  attackOptions,
}) => {
  const { euiTheme } = useEuiTheme();
  const [trendOpen, setTrendOpen] = useState(false);

  const watchlistOptions = useMemo(
    () => [
      {
        key: WATCHLIST_ANY,
        label: i18n.translate(`${I18N_PREFIX}.watchlist.any`, {
          defaultMessage: 'On any watchlist',
        }),
      },
      ...watchlistNames.map((name) => ({ key: name, label: name })),
      {
        key: WATCHLIST_NONE,
        label: i18n.translate(`${I18N_PREFIX}.watchlist.none`, {
          defaultMessage: 'Not on any watchlist',
        }),
      },
    ],
    [watchlistNames]
  );

  return (
    <div
      css={css`
        display: flex;
        align-items: center;
        gap: ${euiTheme.size.m};
        flex-wrap: wrap;
      `}
      data-test-subj="entityIntelligenceEntitiesFilters"
    >
      <div
        css={css`
          flex: 1 1 240px;
          max-width: 360px;
          min-width: 200px;
        `}
      >
        <EuiFieldSearch
          placeholder={i18n.translate(`${I18N_PREFIX}.searchPlaceholder`, {
            defaultMessage: 'Search name or identity…',
          })}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          fullWidth
          compressed
          incremental
          data-test-subj="entityIntelligenceEntitiesSearch"
        />
      </div>

      <EuiButtonGroup
        legend={i18n.translate(`${I18N_PREFIX}.type.legend`, { defaultMessage: 'Entity type' })}
        options={TYPE_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
        idSelected={snapshot.type}
        onChange={(id) => onTypeChange(id as EntityTypeFilter)}
        buttonSize="compressed"
        data-test-subj="entityIntelligenceEntitiesTypeFilter"
      />

      {/* Attribute filters: refine the entity population by intrinsic traits. */}
      <EuiFilterGroup compressed>
        <MultiSelectFilter
          label={i18n.translate(`${I18N_PREFIX}.filters.riskLevel`, {
            defaultMessage: 'Risk level',
          })}
          selected={snapshot.levels}
          options={RISK_LEVELS.map((level) => ({ key: level, label: level }))}
          onChange={(selected) => onLevelsChange(selected as RiskLevel[])}
          dataTestSubj="entityIntelligenceEntitiesRiskFilter"
        />
        <MultiSelectFilter
          label={i18n.translate(`${I18N_PREFIX}.filters.criticality`, {
            defaultMessage: 'Criticality',
          })}
          selected={snapshot.crits}
          options={CRIT_KEYS.map((key) => ({ key, label: criticalityLabel(key) }))}
          onChange={onCritsChange}
          dataTestSubj="entityIntelligenceEntitiesCritFilter"
        />
        <EuiPopover
          aria-label={i18n.translate(`${I18N_PREFIX}.filters.riskTrend`, {
            defaultMessage: 'Risk trend',
          })}
          isOpen={trendOpen}
          closePopover={() => setTrendOpen(false)}
          panelPaddingSize="s"
          button={
            <EuiFilterButton
              iconType="chevronSingleDown"
              onClick={() => setTrendOpen((v) => !v)}
              isSelected={trendOpen}
              hasActiveFilters={snapshot.trend !== 'any'}
              numActiveFilters={snapshot.trend !== 'any' ? 1 : 0}
              data-test-subj="entityIntelligenceEntitiesTrendFilter"
            >
              {i18n.translate(`${I18N_PREFIX}.filters.riskTrend`, { defaultMessage: 'Risk trend' })}
            </EuiFilterButton>
          }
        >
          <EuiButtonGroup
            legend={i18n.translate(`${I18N_PREFIX}.trend.legend`, { defaultMessage: 'Risk trend' })}
            options={TREND_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
            idSelected={snapshot.trend}
            onChange={(id) => {
              onTrendChange(id as RiskTrendFilter);
              setTrendOpen(false);
            }}
            buttonSize="compressed"
            isFullWidth
          />
        </EuiPopover>
      </EuiFilterGroup>

      {/* Pivot filters: scope to a specific rule / case / attack / watchlist. */}
      <EuiFilterGroup compressed>
        <SingleSelectFilter
          label={i18n.translate(`${I18N_PREFIX}.filters.rule`, { defaultMessage: 'Rule' })}
          selectedId={snapshot.rule}
          options={rules.map((r) => ({ id: r.ruleName, label: r.ruleName, count: r.entityCount }))}
          onChange={onRuleChange}
          dataTestSubj="entityIntelligenceEntitiesRuleFilter"
          emptyMessage={i18n.translate(`${I18N_PREFIX}.filters.noRules`, {
            defaultMessage: 'No firing rules',
          })}
        />
        <SingleSelectFilter
          label={i18n.translate(`${I18N_PREFIX}.filters.case`, { defaultMessage: 'Case' })}
          selectedId={snapshot.caseId}
          options={caseOptions.map((c) => ({ id: c.id, label: c.title, count: c.entityCount }))}
          onChange={onCaseChange}
          dataTestSubj="entityIntelligenceEntitiesCaseFilter"
          emptyMessage={i18n.translate(`${I18N_PREFIX}.filters.noCases`, {
            defaultMessage: 'No cases with entities',
          })}
        />
        <SingleSelectFilter
          label={i18n.translate(`${I18N_PREFIX}.filters.attack`, { defaultMessage: 'Attack' })}
          selectedId={snapshot.attackId}
          options={attackOptions.map((a) => ({ id: a.id, label: a.title, count: a.entityCount }))}
          onChange={onAttackChange}
          dataTestSubj="entityIntelligenceEntitiesAttackFilter"
          emptyMessage={i18n.translate(`${I18N_PREFIX}.filters.noAttacks`, {
            defaultMessage: 'No attack discoveries',
          })}
        />
        <MultiSelectFilter
          label={i18n.translate(`${I18N_PREFIX}.filters.watchlist`, {
            defaultMessage: 'Watchlist',
          })}
          selected={snapshot.watchlists}
          options={watchlistOptions}
          onChange={onWatchlistsChange}
          dataTestSubj="entityIntelligenceEntitiesWatchlistFilter"
        />
      </EuiFilterGroup>
    </div>
  );
};
