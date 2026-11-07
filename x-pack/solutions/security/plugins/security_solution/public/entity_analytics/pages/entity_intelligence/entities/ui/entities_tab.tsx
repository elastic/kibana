/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButtonGroup,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiIcon,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import { useSpaceId } from '../../../../../common/hooks/use_space_id';
import type { IntelligenceEntity, RiskLevel } from '../../common';
import type {
  EntityColumnId,
  EntityTypeFilter,
  FilterSnapshot,
  KpiTab,
  RiskTrendFilter,
  SavedFilterGroup,
  SortState,
  TileSize,
  TrendWindow,
  TriageTileKey,
} from '../types';
import {
  activeColumns,
  builtinSavedGroups,
  COLUMN_PREFS_STORAGE_KEY,
  defaultVisible,
  DEFAULT_ORDER,
  emptySnapshot,
  parseColumnPrefs,
  parseSavedGroups,
  SAVED_GROUPS_STORAGE_KEY,
  savedGroupCount,
  selectVisibleRows,
  serializeColumnPrefs,
  serializeSavedGroups,
  snapshotsEqual,
  snapshotIsActive,
} from '../entities_logic';
import { buildAttentionTiles, buildPulseTiles } from '../kpi_model';
import { useEntityRows } from '../../hooks/use_entity_rows';
import { useEntityAlertSignals } from '../../hooks/use_entity_alert_signals';
import { useEntityCases } from '../../hooks/use_entity_cases';
import { useEntityAttacks } from '../../hooks/use_entity_attacks';
import { useEntityWatchlists } from '../../hooks/use_entity_watchlists';
import { useLocalStorageState } from '../../hooks/use_local_storage_state';
import { KpiTiles } from './kpi_tiles';
import { EntitiesFilters } from './entities_filters';
import { EntitiesTable } from './entities_table';
import { ColumnsConfigurator } from './columns_configurator';
import { SavedGroupsBar } from './saved_groups_bar';
import { ActiveFilterPills } from './active_filter_pills';
import { EntityDossierPanel } from '../../entity_dossier_panel';

const I18N_PREFIX = 'xpack.securitySolution.entityAnalytics.intelligence.entities';

const WINDOW_OPTIONS: Array<{ id: TrendWindow; label: string }> = [
  { id: 'w1', label: i18n.translate(`${I18N_PREFIX}.window.24h`, { defaultMessage: '24 h' }) },
  { id: 'w7', label: i18n.translate(`${I18N_PREFIX}.window.7d`, { defaultMessage: '7 d' }) },
  { id: 'w30', label: i18n.translate(`${I18N_PREFIX}.window.30d`, { defaultMessage: '30 d' }) },
];

const KPI_TAB_OPTIONS: Array<{ id: KpiTab; label: string }> = [
  {
    id: 'attention',
    label: i18n.translate(`${I18N_PREFIX}.kpiTab.attention`, { defaultMessage: 'Needs attention' }),
  },
  {
    id: 'pulse',
    label: i18n.translate(`${I18N_PREFIX}.kpiTab.pulse`, { defaultMessage: 'Environment pulse' }),
  },
];

const SIZE_OPTIONS: Array<{ id: TileSize; label: string }> = [
  {
    id: 'long',
    label: i18n.translate(`${I18N_PREFIX}.size.expanded`, { defaultMessage: 'Expanded' }),
  },
  {
    id: 'short',
    label: i18n.translate(`${I18N_PREFIX}.size.compact`, { defaultMessage: 'Compact' }),
  },
];

export interface EntitiesTabProps {
  /** Drill an entity into the Explorer tab (reuses the shell handoff). */
  onDrillToExplorer: (entity: IntelligenceEntity) => void;
}

/**
 * The Entities listing/triage tab. Renders real entity-store population with
 * every joined signal, triage KPI tiles that filter the table, a full filter
 * toolbar (incl. case + attack pivots), configurable/persisted columns, saved
 * filter groups, and a row-click detail flyout reusing the existing dossier.
 */
export const EntitiesTab: React.FC<EntitiesTabProps> = ({ onDrillToExplorer }) => {
  const { euiTheme } = useEuiTheme();
  const spaceId = useSpaceId();

  const {
    rows,
    total,
    loadedCount,
    isTruncated,
    hasIncompleteEvidence,
    now,
    dailyActiveSeries,
    hasRiskHistory,
    isEntitiesLoading,
    isError,
  } = useEntityRows();
  const { rulesWithCounts } = useEntityAlertSignals();
  const { caseOptions } = useEntityCases();
  const { attackOptions } = useEntityAttacks();
  const { watchlistNames } = useEntityWatchlists();

  // ---- View state ----
  const [win, setWin] = useState<TrendWindow>('w1');
  const [kpiTab, setKpiTab] = useState<KpiTab>('attention');
  const [tileSize, setTileSize] = useState<TileSize>('long');
  const [snapshot, setSnapshot] = useState<FilterSnapshot>(emptySnapshot());
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortState>({ col: 'risk', dir: -1 });
  const [selected, setSelected] = useState<IntelligenceEntity | undefined>();
  const [coachDismissed, setCoachDismissed] = useLocalStorageState<boolean>(
    `${I18N_PREFIX}.coach`,
    spaceId,
    (raw) => raw === 'true',
    (v) => String(v)
  );

  // ---- Persisted column preferences ----
  const [colPrefs, setColPrefs] = useLocalStorageState(
    COLUMN_PREFS_STORAGE_KEY,
    spaceId,
    parseColumnPrefs,
    serializeColumnPrefs
  );

  // ---- Persisted saved filter groups ----
  const [userGroups, setUserGroups] = useLocalStorageState<SavedFilterGroup[]>(
    SAVED_GROUPS_STORAGE_KEY,
    spaceId,
    parseSavedGroups,
    serializeSavedGroups
  );
  const allGroups = useMemo(() => [...builtinSavedGroups(), ...userGroups], [userGroups]);

  // ---- Derived data ----
  const attentionTiles = useMemo(() => buildAttentionTiles(rows, win, now), [rows, win, now]);
  const pulseTiles = useMemo(
    () => buildPulseTiles(rows, win, now, dailyActiveSeries),
    [rows, win, now, dailyActiveSeries]
  );

  const visibleRows = useMemo(
    () => selectVisibleRows(rows, snapshot, search, sort, win, now),
    [rows, snapshot, search, sort, win, now]
  );

  const columns = useMemo(() => activeColumns(colPrefs), [colPrefs]);

  const groupCounts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const group of allGroups) out[group.id] = savedGroupCount(group, rows, win, now);
    return out;
  }, [allGroups, rows, win, now]);

  const caseTitleById = useMemo(
    () => new Map(caseOptions.map((c) => [c.id, c.title])),
    [caseOptions]
  );
  const attackTitleById = useMemo(
    () => new Map(attackOptions.map((a) => [a.id, a.title])),
    [attackOptions]
  );

  // ---- Handlers ----
  const patchSnapshot = useCallback((patch: Partial<FilterSnapshot>) => {
    setSnapshot((prev) => ({ ...prev, ...patch }));
  }, []);

  const toggleTile = useCallback(
    (key: TriageTileKey) => {
      setSnapshot((prev) => ({
        ...prev,
        tileFilter: prev.tileFilter === key ? null : key,
      }));
      setCoachDismissed(true);
    },
    [setCoachDismissed]
  );

  const onSort = useCallback((col: EntityColumnId) => {
    setSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === 1 ? -1 : 1 }
        : { col, dir: col === 'name' ? 1 : -1 }
    );
  }, []);

  const onRuleClick = useCallback((rule: string) => {
    setSnapshot((prev) => ({ ...prev, rule: prev.rule === rule ? null : rule }));
  }, []);

  const applyGroup = useCallback((group: SavedFilterGroup) => {
    setSnapshot(group.snap);
  }, []);

  const saveGroup = useCallback(
    (name: string) => {
      setUserGroups([
        ...userGroups,
        { id: `user-${Date.now()}`, name, builtin: false, snap: snapshot },
      ]);
    },
    [snapshot, userGroups, setUserGroups]
  );

  const deleteGroup = useCallback(
    (id: string) => setUserGroups(userGroups.filter((g) => g.id !== id)),
    [userGroups, setUserGroups]
  );

  const onColReorder = useCallback(
    (order: EntityColumnId[]) => setColPrefs({ ...colPrefs, order }),
    [colPrefs, setColPrefs]
  );
  const onColToggle = useCallback(
    (id: EntityColumnId, visible: boolean) => {
      const visSet = new Set(colPrefs.vis);
      if (visible) visSet.add(id);
      else visSet.delete(id);
      setColPrefs({ ...colPrefs, vis: [...visSet] });
    },
    [colPrefs, setColPrefs]
  );
  const onColReset = useCallback(
    () => setColPrefs({ order: [...DEFAULT_ORDER], vis: defaultVisible() }),
    [setColPrefs]
  );

  const showCoach = kpiTab === 'attention' && !coachDismissed && !snapshot.tileFilter;

  const asOf = i18n.translate(`${I18N_PREFIX}.asOf`, {
    defaultMessage:
      'Entity store · {total, number} monitored {total, plural, one {entity} other {entities}}',
    values: { total },
  });

  if (isError) {
    return (
      <KbnDangerCallout
        announceOnMount
        title={i18n.translate(`${I18N_PREFIX}.loadError`, {
          defaultMessage: 'Failed to load entities',
        })}
        data-test-subj="entityIntelligenceEntitiesError"
      />
    );
  }

  return (
    <div data-test-subj="entityIntelligenceEntitiesTab">
      {isTruncated && (
        <>
          <KbnWarningCallout
            size="s"
            title={i18n.translate(`${I18N_PREFIX}.partialInventory`, {
              defaultMessage: 'Showing {loaded, number} of {total, number} entities',
              values: { loaded: loadedCount, total },
            })}
          >
            <p>
              {i18n.translate(`${I18N_PREFIX}.partialInventoryDescription`, {
                defaultMessage:
                  'Search, filters, and summaries apply to the loaded highest-risk entities. Name-based evidence cannot be fully resolved across the remaining inventory.',
              })}
            </p>
          </KbnWarningCallout>
          <EuiSpacer size="m" />
        </>
      )}
      {hasIncompleteEvidence && !isEntitiesLoading && (
        <>
          <KbnWarningCallout
            size="s"
            title={i18n.translate(`${I18N_PREFIX}.incompleteEvidence`, {
              defaultMessage: 'Some evidence is unavailable, partial, or ambiguous',
            })}
          >
            <p>
              {i18n.translate(`${I18N_PREFIX}.incompleteEvidenceDescription`, {
                defaultMessage:
                  'A dash means the signal could not be established. Affected summaries do not assume zero activity.',
              })}
            </p>
          </KbnWarningCallout>
          <EuiSpacer size="m" />
        </>
      )}
      {/* Meta + quiet view controls in a single calm header row. */}
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false} wrap>
        <EuiFlexItem>
          <EuiText
            size="xs"
            color="subdued"
            css={css`
              text-transform: uppercase;
              letter-spacing: 0.05em;
            `}
          >
            {asOf}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend={i18n.translate(`${I18N_PREFIX}.kpiTab.legend`, {
              defaultMessage: 'Summary view',
            })}
            options={KPI_TAB_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
            idSelected={kpiTab}
            onChange={(id) => setKpiTab(id as KpiTab)}
            buttonSize="compressed"
            data-test-subj="entityIntelligenceEntitiesKpiTab"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend={i18n.translate(`${I18N_PREFIX}.window.legend`, {
              defaultMessage: 'Trend window',
            })}
            options={WINDOW_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
            idSelected={win}
            onChange={(id) => setWin(id as TrendWindow)}
            buttonSize="compressed"
            data-test-subj="entityIntelligenceEntitiesWindow"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend={i18n.translate(`${I18N_PREFIX}.size.legend`, { defaultMessage: 'Tile size' })}
            options={SIZE_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
            idSelected={tileSize}
            onChange={(id) => setTileSize(id as TileSize)}
            buttonSize="compressed"
            data-test-subj="entityIntelligenceEntitiesTileSize"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      {showCoach ? (
        <>
          <div
            css={css`
              display: flex;
              align-items: flex-start;
              gap: ${euiTheme.size.s};
              padding: ${euiTheme.size.s} ${euiTheme.size.m};
              border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};
              border-radius: ${euiTheme.border.radius.medium};
              background: ${euiTheme.colors.backgroundBaseSubdued};
              color: ${euiTheme.colors.textSubdued};
            `}
            data-test-subj="entityIntelligenceEntitiesCoach"
          >
            <EuiIcon type="question" size="m" color="subdued" aria-hidden={true} />
            <EuiText
              size="xs"
              color="subdued"
              css={css`
                flex: 1;
              `}
            >
              <strong
                css={css`
                  color: ${euiTheme.colors.textParagraph};
                `}
              >
                {i18n.translate(`${I18N_PREFIX}.coachTitle`, {
                  defaultMessage: 'Start with a tile',
                })}
              </strong>
              {' — '}
              {i18n.translate(`${I18N_PREFIX}.coachBody`, {
                defaultMessage:
                  'Each tile is a triage entry point — click one to cut the monitored entities down to the handful worth investigating right now, then refine with the filters below.',
              })}
            </EuiText>
            <EuiToolTip
              content={i18n.translate(`${I18N_PREFIX}.coachDismiss`, { defaultMessage: 'Dismiss' })}
            >
              <EuiButtonIcon
                iconType="cross"
                size="xs"
                color="text"
                aria-label={i18n.translate(`${I18N_PREFIX}.coachDismiss`, {
                  defaultMessage: 'Dismiss',
                })}
                onClick={() => setCoachDismissed(true)}
              />
            </EuiToolTip>
          </div>
          <EuiSpacer size="m" />
        </>
      ) : null}

      {!hasRiskHistory ? (
        <>
          <div
            css={css`
              display: flex;
              align-items: center;
              gap: ${euiTheme.size.s};
              padding: ${euiTheme.size.s} ${euiTheme.size.m};
              color: ${euiTheme.colors.textSubdued};
            `}
          >
            <EuiIcon type="clock" size="s" color="subdued" aria-hidden={true} />
            <EuiText size="xs" color="subdued">
              {i18n.translate(`${I18N_PREFIX}.noHistory`, {
                defaultMessage:
                  'Risk-score history is unavailable. Trend deltas and first-time High/Critical summaries remain unknown until history is available.',
              })}
            </EuiText>
          </div>
          <EuiSpacer size="m" />
        </>
      ) : null}

      {isEntitiesLoading && rows.length === 0 ? (
        <EuiSkeletonText lines={4} />
      ) : (
        <KpiTiles
          tiles={kpiTab === 'attention' ? attentionTiles : pulseTiles}
          size={tileSize}
          activeTileFilter={snapshot.tileFilter}
          onToggleTile={toggleTile}
        />
      )}

      <EuiSpacer size="l" />

      <SavedGroupsBar
        groups={allGroups}
        currentSnapshot={snapshot}
        counts={groupCounts}
        onApply={applyGroup}
        onClear={() => setSnapshot(emptySnapshot())}
        onSave={saveGroup}
        onDelete={deleteGroup}
      />

      <EuiSpacer size="m" />

      {/* Command bar: search + type + filters + columns read as one surface. */}
      <div
        css={css`
          border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain};
          border-radius: ${euiTheme.border.radius.medium};
          background: ${euiTheme.colors.backgroundBaseSubdued};
          padding: ${euiTheme.size.s};
          display: flex;
          flex-direction: column;
          gap: ${euiTheme.size.s};
        `}
      >
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem>
            <EntitiesFilters
              snapshot={snapshot}
              searchValue={search}
              onSearchChange={setSearch}
              onTypeChange={(type: EntityTypeFilter) => patchSnapshot({ type })}
              onLevelsChange={(levels: RiskLevel[]) => patchSnapshot({ levels })}
              onCritsChange={(crits) => patchSnapshot({ crits })}
              onTrendChange={(trend: RiskTrendFilter) => patchSnapshot({ trend })}
              onRuleChange={(rule) => patchSnapshot({ rule })}
              onWatchlistsChange={(watchlists) => patchSnapshot({ watchlists })}
              onCaseChange={(caseId) => patchSnapshot({ caseId })}
              onAttackChange={(attackId) => patchSnapshot({ attackId })}
              watchlistNames={watchlistNames}
              rules={rulesWithCounts}
              caseOptions={caseOptions}
              attackOptions={attackOptions}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ColumnsConfigurator
              order={colPrefs.order}
              visible={colPrefs.vis}
              onReorder={onColReorder}
              onToggle={onColToggle}
              onReset={onColReset}
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        {snapshotIsActive(snapshot) ? (
          <>
            <div
              css={css`
                height: ${euiTheme.border.width.thin};
                background: ${euiTheme.colors.borderBaseSubdued};
                margin: 0 -${euiTheme.size.s};
              `}
            />
            <ActiveFilterPills
              snapshot={snapshot}
              onClearAll={() => setSnapshot(emptySnapshot())}
              onClearTile={() => patchSnapshot({ tileFilter: null })}
              onClearRule={() => patchSnapshot({ rule: null })}
              onClearCase={() => patchSnapshot({ caseId: null })}
              onClearAttack={() => patchSnapshot({ attackId: null })}
              caseTitleById={caseTitleById}
              attackTitleById={attackTitleById}
            />
          </>
        ) : null}
      </div>

      <EuiSpacer size="l" />

      <div
        css={css`
          border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain};
          border-radius: ${euiTheme.border.radius.medium};
          overflow: hidden;
          background: ${euiTheme.colors.emptyShade};
        `}
      >
        <div
          css={css`
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: ${euiTheme.size.s};
            padding: ${euiTheme.size.s} ${euiTheme.size.base};
            border-bottom: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};
            background: ${euiTheme.colors.backgroundBaseSubdued};
          `}
        >
          <EuiText
            size="s"
            css={css`
              display: inline-flex;
              align-items: baseline;
              gap: ${euiTheme.size.xs};
            `}
          >
            <strong
              css={css`
                font-variant-numeric: tabular-nums;
                color: ${euiTheme.colors.textHeading};
              `}
            >
              {visibleRows.length.toLocaleString()}
            </strong>
            <span
              css={css`
                color: ${euiTheme.colors.textSubdued};
              `}
            >
              {i18n.translate(`${I18N_PREFIX}.resultCount`, {
                defaultMessage:
                  '{count, plural, one {entity} other {entities}} {filtered, select, true {match your filters} other {in entity store}}',
                values: {
                  count: visibleRows.length,
                  filtered: !snapshotsEqual(snapshot, emptySnapshot()) || search !== '',
                },
              })}
            </span>
          </EuiText>
        </div>
        {isEntitiesLoading && rows.length === 0 ? (
          <div
            css={css`
              padding: ${euiTheme.size.l};
            `}
          >
            <EuiSkeletonText lines={6} />
          </div>
        ) : (
          <EntitiesTable
            rows={visibleRows}
            columns={columns}
            sort={sort}
            win={win}
            now={now}
            activeRule={snapshot.rule}
            onSort={onSort}
            onRuleClick={onRuleClick}
            onRowClick={(row) => setSelected(row.base)}
          />
        )}
      </div>

      {selected ? (
        <EuiFlyout
          onClose={() => setSelected(undefined)}
          size="s"
          ownFocus
          data-test-subj="entityIntelligenceEntitiesFlyout"
          aria-labelledby="entityIntelligenceEntitiesFlyoutTitle"
        >
          <EuiFlyoutBody>
            <EntityDossierPanel entity={selected} />
            <EuiSpacer size="m" />
            <EuiText size="xs" color="subdued">
              <button
                type="button"
                css={css`
                  color: ${euiTheme.colors.primaryText};
                  background: none;
                  border: none;
                  cursor: pointer;
                  padding: 0;
                `}
                onClick={() => {
                  onDrillToExplorer(selected);
                  setSelected(undefined);
                }}
                data-test-subj="entityIntelligenceEntitiesDrillExplorer"
              >
                {i18n.translate(`${I18N_PREFIX}.openInExplorer`, {
                  defaultMessage: 'Open in Explorer →',
                })}
              </button>
            </EuiText>
          </EuiFlyoutBody>
        </EuiFlyout>
      ) : null}
    </div>
  );
};
