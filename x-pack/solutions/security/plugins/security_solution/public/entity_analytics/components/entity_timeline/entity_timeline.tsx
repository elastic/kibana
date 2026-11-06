/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  type EuiBasicTableColumn,
  EuiIcon,
  EuiInMemoryTable,
  EuiAvatar,
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFlexGrid,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiPanel,
  EuiPopover,
  EuiPopoverFooter,
  EuiProgress,
  EuiSelectable,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTimeline,
  EuiTimelineItem,
  EuiTitle,
  useEuiTheme,
  type EuiSelectableOption,
  type EuiStatProps,
} from '@elastic/eui';
import { PreferenceFormattedDate } from '../../../common/components/formatted_date';
import { RiskScoreLevel } from '../severity/common';
import { RISK_SEVERITY_COLOUR } from '../../common/utils';
import { AssetCriticalityBadge } from '../asset_criticality/asset_criticality_badge';
import { AttackZoomHeader } from './attack_zoom_header';
import { DiscussionNote } from './discussion_notes';
import {
  ALL_KINDS,
  CATEGORY_BY_KIND,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  DAY_MS,
  KIND_LABELS,
  LENS_DEFAULT_RANGE,
  LENS_TIME_RANGES,
  RISK_FILTER_KINDS,
  RISK_LENS_KINDS,
  TIME_RANGE_MS,
  eventTime,
  formatContribution,
  getAttackWindow,
  getGroupKey,
  getGroupLabel,
  getGroupingUnit,
  getModifiersAt,
  getRiskExclusionReason,
  getRunningScore,
  getScoreAfterEvent,
  isAlertLike,
  isModifierEvent,
  isUncased,
  type RiskFilterId,
  type TimeRangeId,
  type TimeWindow,
} from './lens';
import { TimelineChart } from './timeline_chart';
import { TimelineEventItem } from './timeline_event_item';
import { useCategoryColors } from './use_category_colors';
import { useTimelineFlyouts } from './use_timeline_flyouts';
import type {
  AlertZeroStatus,
  EntityTimelineData,
  EntityTimelineEvent,
  EntityTimelineEventKind,
  EntityTimelineLens,
} from './types';

export interface EntityTimelineProps {
  data: EntityTimelineData;
  /**
   * `full`: everything that happened to the entity.
   * `risk`: only what explains the current risk score.
   * Both can zoom into an attack; Attack discovery can reuse this with its own lens later.
   */
  lens: EntityTimelineLens;
}

const RANGE_LABELS: Record<TimeRangeId, string> = {
  '24h': '24h',
  '7d': '7d',
  '30d': '30d',
  '90d': '90d',
  '1y': '1y',
};

const RISK_FILTER_LABELS: Record<RiskFilterId, string> = {
  alerts: 'Alerts',
  criticality: 'Criticality',
  watchlists: 'Watchlists',
};

/** The Timeline tab shows individual alerts only, not bursts. */
const TIMELINE_KINDS = ALL_KINDS.filter((kind) => kind !== 'alert_burst');

const ALL_RISK_FILTERS = Object.keys(RISK_FILTER_KINDS) as RiskFilterId[];

const searchableText = (event: EntityTimelineEvent): string =>
  [
    event.title,
    event.description,
    event.source,
    event.host,
    event.tactic,
    event.watchlist,
    event.caseId,
    ...(event.burstRules ?? []).map((rule) => rule.name),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

const countAlerts = (events: EntityTimelineEvent[]): number =>
  events
    .filter(isAlertLike)
    .reduce(
      (total, event) => total + (event.kind === 'alert_burst' ? event.alertCount ?? 1 : 1),
      0
    );

const formatWindow = ({ from, to }: TimeWindow): string => {
  const format = (time: number) =>
    new Date(time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${format(from)} – ${format(to)}`;
};

export const EntityTimeline: React.FC<EntityTimelineProps> = ({ data, lens }) => {
  const { euiTheme } = useEuiTheme();
  const [now] = useState(Date.now);
  const [rangeId, setRangeId] = useState<TimeRangeId>(LENS_DEFAULT_RANGE[lens]);
  const [brushWindow, setBrushWindow] = useState<TimeWindow | null>(null);
  const [selectedKinds, setSelectedKinds] = useState<Set<EntityTimelineEventKind>>(
    () => new Set(TIMELINE_KINDS)
  );
  const [riskFilters, setRiskFilters] = useState<Set<RiskFilterId>>(
    () => new Set(ALL_RISK_FILTERS)
  );
  const [isTypesOpen, setIsTypesOpen] = useState(false);
  const [keyOnly, setKeyOnly] = useState(false);
  const [uncasedOnly, setUncasedOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [zoomAttackId, setZoomAttackId] = useState<string | null>(null);
  const [zoomTactic, setZoomTactic] = useState<string | null>(null);
  const [alertZeroDecisions, setAlertZeroDecisions] = useState<Record<string, AlertZeroStatus>>({});

  const riskWindowStart = now - data.riskWindowDays * DAY_MS;

  const attack = useMemo(
    () =>
      zoomAttackId
        ? data.events.find((event) => event.kind === 'attack' && event.attackId === zoomAttackId)
        : undefined,
    [data.events, zoomAttackId]
  );

  const timeWindow = useMemo<TimeWindow>(
    () =>
      attack
        ? getAttackWindow(attack, now)
        : brushWindow ?? { from: now - TIME_RANGE_MS[rangeId], to: now },
    [attack, brushWindow, now, rangeId]
  );

  const isOutsideAttack = useCallback(
    (event: EntityTimelineEvent) => Boolean(attack && isAlertLike(event) && !event.attackId),
    [attack]
  );

  const sourceEvents = useMemo(
    () =>
      lens === 'full'
        ? data.events.filter((event) => TIMELINE_KINDS.includes(event.kind))
        : data.events,
    [data.events, lens]
  );

  const { openAlert, openAttack } = useTimelineFlyouts(data);

  /** Events the lens (and attack zoom) can show, before the user's filters. */
  const lensEvents = useMemo(() => {
    let events = sourceEvents.filter((event) => {
      const time = eventTime(event);
      return time >= timeWindow.from && time <= timeWindow.to;
    });

    if (lens === 'risk') {
      events = events.filter((event) => {
        if (eventTime(event) < riskWindowStart) return false;
        return event.contribution != null || isModifierEvent(event);
      });
    }

    if (attack) {
      events = events.filter(
        (event) =>
          event.attackId === attack.attackId ||
          isOutsideAttack(event) ||
          (lens === 'full' && event.kind === 'risk_level')
      );
    }

    return events;
  }, [attack, isOutsideAttack, lens, riskWindowStart, sourceEvents, timeWindow]);

  const visibleEvents = useMemo(() => {
    const query = search.trim().toLowerCase();
    const riskKinds = new Set(
      Array.from(riskFilters).flatMap((filter) => RISK_FILTER_KINDS[filter])
    );
    return lensEvents.filter((event) => {
      if (lens === 'full' && !selectedKinds.has(event.kind)) return false;
      if (lens === 'risk' && RISK_LENS_KINDS.includes(event.kind) && !riskKinds.has(event.kind)) {
        return false;
      }
      if (keyOnly && !event.keyReason) return false;
      if (uncasedOnly && !isUncased(event)) return false;
      if (zoomTactic && event.tactic !== zoomTactic && event.kind !== 'attack') return false;
      if (query && !searchableText(event).includes(query)) return false;
      return true;
    });
  }, [keyOnly, lens, lensEvents, riskFilters, search, selectedKinds, uncasedOnly, zoomTactic]);

  const scorePoints = useMemo(
    () => (lens === 'risk' ? getRunningScore(data, timeWindow, now) : []),
    [data, lens, now, timeWindow]
  );
  const scoreAfterEvent = useMemo(() => getScoreAfterEvent(scorePoints), [scorePoints]);

  const kindCounts = useMemo(() => {
    const counts = new Map<EntityTimelineEventKind, number>();
    lensEvents.forEach((event) => counts.set(event.kind, (counts.get(event.kind) ?? 0) + 1));
    return counts;
  }, [lensEvents]);

  const keyCount = lensEvents.filter((event) => event.keyReason).length;
  const uncasedCount = lensEvents.filter(isUncased).length;

  const groups = useMemo(() => {
    const unit = attack ? 'day' : getGroupingUnit(timeWindow);
    const sorted = [...visibleEvents].sort((a, b) => eventTime(b) - eventTime(a));
    const byKey = new Map<string, { label: string; events: EntityTimelineEvent[] }>();
    sorted.forEach((event) => {
      const key = getGroupKey(event, unit);
      const group = byKey.get(key);
      if (group) group.events.push(event);
      else byKey.set(key, { label: getGroupLabel(event, unit, now), events: [event] });
    });
    return { unit, list: Array.from(byKey.entries()) };
  }, [attack, now, timeWindow, visibleEvents]);

  const onZoomAttack = useCallback((attackId: string) => {
    setZoomAttackId(attackId);
    setZoomTactic(null);
  }, []);

  const onExitAttack = useCallback(() => {
    setZoomAttackId(null);
    setZoomTactic(null);
  }, []);

  const onAlertZeroDecision = useCallback(
    (eventId: string, status: AlertZeroStatus) =>
      setAlertZeroDecisions((current) => ({ ...current, [eventId]: status })),
    []
  );

  const typeOptions = useMemo<EuiSelectableOption[]>(
    () =>
      CATEGORY_ORDER.flatMap((category) => [
        { label: CATEGORY_LABELS[category], isGroupLabel: true },
        ...TIMELINE_KINDS.filter((kind) => CATEGORY_BY_KIND[kind] === category).map((kind) => ({
          key: kind,
          label: KIND_LABELS[kind],
          checked: selectedKinds.has(kind) ? ('on' as const) : undefined,
          append: <EuiBadge color="hollow">{kindCounts.get(kind) ?? 0}</EuiBadge>,
        })),
      ]),
    [kindCounts, selectedKinds]
  );

  const onTypesChange = useCallback((options: EuiSelectableOption[]) => {
    setSelectedKinds(
      new Set(
        options
          .filter((option) => option.checked === 'on' && option.key)
          .map((option) => option.key as EntityTimelineEventKind)
      )
    );
  }, []);

  const toggleRiskFilter = useCallback((filter: RiskFilterId) => {
    setRiskFilters((current) => {
      const next = new Set(current);
      if (next.has(filter)) next.delete(filter);
      else next.add(filter);
      return next;
    });
  }, []);

  const riskFilterCount = (filter: RiskFilterId) =>
    lensEvents.filter((event) => RISK_FILTER_KINDS[filter].includes(event.kind)).length;

  const hiddenKindCount = TIMELINE_KINDS.length - selectedKinds.size;
  const attackEvents = useMemo(
    () => (attack ? sourceEvents.filter((event) => event.attackId === attack.attackId) : []),
    [attack, sourceEvents]
  );

  // Modifiers set before the visible window still count toward the score.
  const carriedModifiers = lens === 'risk' && !attack ? getModifiersAt(data, timeWindow.from) : [];

  const filtersRow = (
    <EuiFlexGroup gutterSize="s" responsive={false} wrap alignItems="center">
      <EuiFlexItem grow={false}>
        {lens === 'full' ? (
          <EuiFilterGroup compressed>
            <EuiPopover
              aria-label="Event types"
              isOpen={isTypesOpen}
              closePopover={() => setIsTypesOpen(false)}
              panelPaddingSize="none"
              button={
                <EuiFilterButton
                  iconType="chevronSingleDown"
                  onClick={() => setIsTypesOpen((open) => !open)}
                  isSelected={isTypesOpen}
                  hasActiveFilters={hiddenKindCount > 0}
                  numFilters={TIMELINE_KINDS.length}
                  numActiveFilters={selectedKinds.size}
                  data-test-subj="entityTimelineTypesButton"
                >
                  Event types
                </EuiFilterButton>
              }
            >
              <EuiSelectable
                aria-label="Event types"
                options={typeOptions}
                onChange={onTypesChange}
                listProps={{ bordered: false, showIcons: true }}
                height={360}
                css={{ width: 300 }}
              >
                {(list) => list}
              </EuiSelectable>
              <EuiPopoverFooter paddingSize="s">
                <EuiFlexGroup gutterSize="s" responsive={false} justifyContent="spaceBetween">
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      size="xs"
                      onClick={() => setSelectedKinds(new Set(TIMELINE_KINDS))}
                    >
                      Show all
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      size="xs"
                      color="danger"
                      onClick={() => setSelectedKinds(new Set())}
                      data-test-subj="entityTimelineTypesClearAll"
                    >
                      Clear all
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPopoverFooter>
            </EuiPopover>
            <EuiFilterButton
              isToggle
              isSelected={keyOnly}
              hasActiveFilters={keyOnly}
              numFilters={keyCount}
              onClick={() => setKeyOnly((value) => !value)}
              data-test-subj="entityTimelineKeyOnly"
            >
              Key events
            </EuiFilterButton>
            <EuiFilterButton
              isToggle
              isSelected={uncasedOnly}
              hasActiveFilters={uncasedOnly}
              numFilters={uncasedCount}
              onClick={() => setUncasedOnly((value) => !value)}
              data-test-subj="entityTimelineUncasedOnly"
            >
              Uncased alerts
            </EuiFilterButton>
          </EuiFilterGroup>
        ) : (
          <EuiFilterGroup compressed>
            {ALL_RISK_FILTERS.map((filter) => (
              <EuiFilterButton
                key={filter}
                isToggle
                isSelected={riskFilters.has(filter)}
                hasActiveFilters={riskFilters.has(filter)}
                numFilters={riskFilterCount(filter)}
                onClick={() => toggleRiskFilter(filter)}
                data-test-subj={`entityTimelineRiskFilter-${filter}`}
              >
                {RISK_FILTER_LABELS[filter]}
              </EuiFilterButton>
            ))}
          </EuiFilterGroup>
        )}
      </EuiFlexItem>
      {lens === 'full' && !attack && (
        <EuiFlexItem grow={false}>
          <DiscussionNote id="lensScope" />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );

  return (
    <div data-test-subj={`entityTimeline-${lens}`}>
      {lens === 'risk' ? (
        <RiskContributionsTable data={data} riskWindowStart={riskWindowStart} now={now} />
      ) : (
        <FullSummary
          events={sourceEvents}
          keyOnly={keyOnly}
          uncasedOnly={uncasedOnly}
          isAlertZeroOnly={selectedKinds.size === 1 && selectedKinds.has('alertzero')}
          onToggleKeyOnly={() => setKeyOnly((value) => !value)}
          onToggleUncasedOnly={() => setUncasedOnly((value) => !value)}
          onToggleAlertZeroOnly={() =>
            setSelectedKinds((current) =>
              current.size === 1 && current.has('alertzero')
                ? new Set(TIMELINE_KINDS)
                : new Set<EntityTimelineEventKind>(['alertzero'])
            )
          }
          onZoomAttack={onZoomAttack}
        />
      )}

      <EuiSpacer size="l" />

      {attack && (
        <>
          <AttackZoomHeader
            attack={attack}
            attackEvents={attackEvents}
            entityName={data.entityName}
            lens={lens}
            selectedTactic={zoomTactic}
            onSelectTactic={setZoomTactic}
            onExit={onExitAttack}
          />
          <EuiSpacer size="l" />
        </>
      )}

      <EuiFlexGroup gutterSize="s" responsive={false} wrap alignItems="center">
        <EuiFlexItem grow css={{ minWidth: 200 }}>
          <EuiFieldSearch
            compressed
            fullWidth
            placeholder={lens === 'risk' ? 'Search contributions' : 'Search events, rules, hosts'}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            isClearable
            aria-label="Search timeline"
            data-test-subj="entityTimelineSearch"
          />
        </EuiFlexItem>
        {!attack && (
          <EuiFlexItem grow={false}>
            <EuiButtonGroup
              legend="Time range"
              buttonSize="compressed"
              options={LENS_TIME_RANGES[lens].map((id) => ({ id, label: RANGE_LABELS[id] }))}
              idSelected={brushWindow ? '' : rangeId}
              onChange={(id) => {
                setBrushWindow(null);
                setRangeId(id as TimeRangeId);
              }}
              data-test-subj="entityTimelineRange"
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      {lens === 'full' ? (
        <>
          <EuiSpacer size="s" />
          {filtersRow}
          <EuiSpacer size="l" />
        </>
      ) : (
        <EuiSpacer size="l" />
      )}

      <EuiPanel hasBorder paddingSize="m">
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem>
            <EuiTitle size="xxs">
              <h3>
                {lens === 'risk'
                  ? 'Running risk score'
                  : `${countLabel(visibleEvents.length, 'event')} in this period`}
              </h3>
            </EuiTitle>
            <EuiText size="xs" color="subdued">
              Drag across the chart to zoom in
            </EuiText>
          </EuiFlexItem>
          {brushWindow && !attack && (
            <EuiFlexItem grow={false}>
              <EuiBadge
                color="primary"
                iconType="cross"
                iconSide="right"
                iconOnClick={() => setBrushWindow(null)}
                iconOnClickAriaLabel="Clear custom range"
              >
                {formatWindow(brushWindow)}
              </EuiBadge>
            </EuiFlexItem>
          )}
          {lens === 'risk' && (
            <EuiFlexItem grow={false}>
              <DiscussionNote id="additive" />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <TimelineChart
          mode={lens === 'risk' ? 'score' : 'density'}
          events={visibleEvents}
          scorePoints={scorePoints}
          window={timeWindow}
          onBrush={setBrushWindow}
        />
        {lens === 'full' && (
          <>
            <EuiSpacer size="s" />
            <CategoryLegend />
          </>
        )}
      </EuiPanel>

      <EuiSpacer size="l" />

      {lens === 'risk' && (
        <>
          {filtersRow}
          <EuiSpacer size="l" />
        </>
      )}

      {groups.list.length === 0 && carriedModifiers.length === 0 ? (
        <EuiEmptyPrompt
          iconType="search"
          titleSize="xs"
          title={<h3>No events match these filters</h3>}
          body="Try a wider time range or fewer filters."
        />
      ) : (
        <>
          {groups.list.map(([key, group]) => (
            <div key={key}>
              <EuiTitle size="xxxs">
                <h4 css={{ textTransform: 'uppercase', color: euiTheme.colors.textSubdued }}>
                  {group.label}
                </h4>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiTimeline gutterSize="m" aria-label={group.label}>
                {group.events.map((event) => (
                  <TimelineEventItem
                    key={event.id}
                    event={event}
                    lens={lens}
                    unit={groups.unit}
                    isZoomed={Boolean(attack)}
                    scoreAfter={scoreAfterEvent.get(event.id)}
                    exclusionReason={
                      lens === 'risk' && event.contribution == null && !isModifierEvent(event)
                        ? getRiskExclusionReason(event)
                        : undefined
                    }
                    isOutsideAttack={isOutsideAttack(event)}
                    alertZeroStatus={alertZeroDecisions[event.id] ?? event.alertZeroStatus}
                    onAlertZeroDecision={onAlertZeroDecision}
                    onZoomAttack={onZoomAttack}
                    onOpenAlert={openAlert}
                    onOpenAttack={openAttack}
                  />
                ))}
              </EuiTimeline>
              <EuiSpacer size="l" />
            </div>
          ))}
          {carriedModifiers.length > 0 && (
            <CarriedModifiers modifiers={carriedModifiers} from={timeWindow.from} />
          )}
        </>
      )}
    </div>
  );
};

const countLabel = (count: number, noun: string): string =>
  `${count} ${noun}${count === 1 ? '' : 's'}`;

interface SummaryCardProps {
  label: string;
  value: number;
  caption: React.ReactNode;
  valueColor?: EuiStatProps['titleColor'];
  isSelected?: boolean;
  onClick?: () => void;
  'data-test-subj'?: string;
}

/** Bordered metric card, styled like the flyout's summary panels; doubles as a quick filter. */
const SummaryCard: React.FC<SummaryCardProps> = ({
  label,
  value,
  caption,
  valueColor = 'default',
  isSelected = false,
  onClick,
  'data-test-subj': dataTestSubj,
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPanel
      hasBorder
      paddingSize="s"
      onClick={onClick}
      aria-pressed={onClick ? isSelected : undefined}
      color={isSelected ? 'primary' : 'plain'}
      css={{
        height: '100%',
        padding: `${euiTheme.size.s} ${euiTheme.size.m}`,
        ...(isSelected ? { borderColor: euiTheme.colors.primary } : {}),
      }}
      data-test-subj={dataTestSubj}
    >
      <EuiStat
        title={value}
        titleSize="s"
        titleColor={valueColor}
        description={
          <EuiText size="xs">
            <strong>{label}</strong>
          </EuiText>
        }
        textAlign="left"
      >
        <EuiText size="xs" color="subdued">
          {caption}
        </EuiText>
      </EuiStat>
    </EuiPanel>
  );
};

interface FullSummaryProps {
  events: EntityTimelineEvent[];
  keyOnly: boolean;
  uncasedOnly: boolean;
  isAlertZeroOnly: boolean;
  onToggleKeyOnly: () => void;
  onToggleUncasedOnly: () => void;
  onToggleAlertZeroOnly: () => void;
  onZoomAttack: (attackId: string) => void;
}

const FullSummary: React.FC<FullSummaryProps> = ({
  events,
  keyOnly,
  uncasedOnly,
  isAlertZeroOnly,
  onToggleKeyOnly,
  onToggleUncasedOnly,
  onToggleAlertZeroOnly,
  onZoomAttack,
}) => {
  const alerts = countAlerts(events);
  const uncased = countAlerts(events.filter(isUncased));
  const attacks = events.filter((event) => event.kind === 'attack');
  const keyCount = events.filter((event) => event.keyReason).length;
  const pending = events.filter(
    (event) => event.kind === 'alertzero' && event.alertZeroStatus === 'pending'
  ).length;
  const correlated = attacks.reduce((total, attack) => total + (attack.alertCount ?? 0), 0);
  const latestAttackId = attacks[attacks.length - 1]?.attackId;

  return (
    <EuiFlexGrid columns={4} gutterSize="s" responsive={false}>
      <EuiFlexItem>
        <SummaryCard
          label="Alerts"
          value={alerts}
          caption={
            <EuiText size="xs" color={uncased ? 'warning' : 'subdued'} component="span">
              {`${uncased} uncased`}
            </EuiText>
          }
          isSelected={uncasedOnly}
          onClick={onToggleUncasedOnly}
          data-test-subj="entityTimelineSummaryAlerts"
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <SummaryCard
          label="Attacks"
          value={attacks.length}
          valueColor={attacks.length ? 'danger' : 'default'}
          caption={`${correlated} alerts correlated`}
          onClick={latestAttackId ? () => onZoomAttack(latestAttackId) : undefined}
          data-test-subj="entityTimelineSummaryAttacks"
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <SummaryCard
          label="Key events"
          value={keyCount}
          caption="Turning points"
          isSelected={keyOnly}
          onClick={onToggleKeyOnly}
          data-test-subj="entityTimelineSummaryKeyEvents"
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <SummaryCard
          label="AlertZero"
          value={pending}
          valueColor={pending ? 'accent' : 'default'}
          caption="Pending approval"
          isSelected={isAlertZeroOnly}
          onClick={onToggleAlertZeroOnly}
          data-test-subj="entityTimelineSummaryAlertZero"
        />
      </EuiFlexItem>
    </EuiFlexGrid>
  );
};

const riskTotals = (data: EntityTimelineData, riskWindowStart: number) => {
  const contributing = data.events.filter(
    (event) => event.contribution != null && eventTime(event) >= riskWindowStart
  );
  const alerts = contributing.reduce((total, event) => total + (event.contribution ?? 0), 0);
  const criticality = data.modifiers
    .filter((modifier) => modifier.label === 'Asset criticality')
    .reduce((total, modifier) => total + modifier.contribution, 0);
  const watchlists = data.modifiers
    .filter((modifier) => modifier.label === 'Watchlist')
    .reduce((total, modifier) => total + modifier.contribution, 0);
  return { alerts, alertCount: countAlerts(contributing), criticality, watchlists };
};

interface ContributionRow {
  id: string;
  field: string;
  value: ReactNode;
  contribution: number;
}

const formatTableContribution = (value: number): string =>
  `${value > 0 ? '+' : ''}${value.toFixed(2)}`;

const getContributionColumns = (
  data: EntityTimelineData
): Array<EuiBasicTableColumn<ContributionRow>> => [
  {
    field: 'field',
    name: 'Risk input',
    width: '33%',
    footer: <strong>Total</strong>,
  },
  {
    field: 'value',
    name: 'Value',
    width: '33%',
    render: (value: ReactNode) => value,
  },
  {
    field: 'contribution',
    name: 'Contribution',
    width: '33%',
    align: 'right',
    render: formatTableContribution,
    footer: <strong>{data.riskScore.toFixed(2)}</strong>,
  },
];

const RiskScoreHeader: React.FC<{ data: EntityTimelineData }> = ({ data }) => (
  <EuiPanel hasBorder paddingSize="m" data-test-subj="entityTimelineRiskScoreHeader">
    <EuiFlexGroup gutterSize="l" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiStat
          title={
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>{data.riskScore.toFixed(0)}</EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s" css={{ fontWeight: 'normal' }}>
                  <RiskScoreLevel severity={data.riskLevel} />
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          titleSize="l"
          titleColor={RISK_SEVERITY_COLOUR[data.riskLevel]}
          description="Risk score"
          reverse
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiProgress
          value={data.riskScore}
          max={100}
          size="s"
          color={RISK_SEVERITY_COLOUR[data.riskLevel]}
          aria-label="Risk score out of 100"
        />
        <EuiSpacer size="s" />
        <EuiText size="xs" color="subdued">
          {`Open and acknowledged alerts from the last ${data.riskWindowDays} days, plus the asset criticality and watchlists in effect now.`}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);

const RiskContributionsTable: React.FC<{
  data: EntityTimelineData;
  riskWindowStart: number;
  now: number;
}> = ({ data, riskWindowStart, now }) => {
  const totals = riskTotals(data, riskWindowStart);
  const criticality = data.modifiers.find((modifier) => modifier.label === 'Asset criticality');
  const criticalityLevel = data.events.find(
    (event) => event.id === criticality?.eventId
  )?.criticalityTo;
  const watchlists = data.modifiers.filter((modifier) => modifier.label === 'Watchlist');

  const items: ContributionRow[] = [
    {
      id: 'alerts',
      field: 'Alerts',
      value: totals.alertCount > 0 ? countLabel(totals.alertCount, 'alert') : EMPTY_VALUE,
      contribution: totals.alerts,
    },
    {
      id: 'criticality',
      field: 'Asset criticality',
      value: criticalityLevel ? (
        <AssetCriticalityBadge criticalityLevel={criticalityLevel} textSize="xs" />
      ) : (
        EMPTY_VALUE
      ),
      contribution: criticality?.contribution ?? 0,
    },
    ...(watchlists.length > 0
      ? watchlists.map((watchlist) => ({
          id: watchlist.id,
          field: 'Watchlist',
          value: watchlist.value,
          contribution: watchlist.contribution,
        }))
      : [{ id: 'watchlist', field: 'Watchlist', value: EMPTY_VALUE, contribution: 0 }]),
  ];

  return (
    <>
      <RiskScoreHeader data={data} />
      <EuiSpacer size="l" />
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        gutterSize="s"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h3>Contributions</h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <DiscussionNote id="topInputs" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="clock" size="s" color="subdued" aria-hidden={true} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <PreferenceFormattedDate value={new Date(now)} />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiInMemoryTable
        compressed
        items={items}
        itemId="id"
        columns={getContributionColumns(data)}
        tableCaption="Contributions to the risk score"
        data-test-subj="entityTimelineRiskContributions"
      />
    </>
  );
};

const EMPTY_VALUE = '–';

const CarriedModifiers: React.FC<{
  modifiers: EntityTimelineData['modifiers'];
  from: number;
}> = ({ modifiers, from }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <>
      <EuiTitle size="xxxs">
        <h4 css={{ textTransform: 'uppercase', color: euiTheme.colors.textSubdued }}>
          {`In effect before ${new Date(from).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })}`}
        </h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiTimeline gutterSize="m">
        <EuiTimelineItem
          verticalAlign="top"
          icon={
            <EuiAvatar
              name="Carried modifiers"
              size="m"
              iconType="pin"
              color={euiTheme.colors.backgroundBaseSubdued}
              iconColor={euiTheme.colors.warning}
            />
          }
        >
          <EuiPanel hasBorder paddingSize="s" data-test-subj="entityTimelineCarriedModifiers">
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>Modifiers carried into this window</strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <DiscussionNote id="modifiersCarried" />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="xs" />
            {modifiers.map((modifier) => (
              <EuiFlexGroup
                key={modifier.id}
                gutterSize="s"
                alignItems="baseline"
                responsive={false}
              >
                <EuiFlexItem>
                  <EuiText size="xs">
                    {`${modifier.label}: ${modifier.value}`}
                    <EuiText size="xs" color="subdued" component="span">
                      {` · since ${new Date(modifier.since).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}`}
                    </EuiText>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="danger">
                    <strong>{formatContribution(modifier.contribution)}</strong>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            ))}
          </EuiPanel>
        </EuiTimelineItem>
      </EuiTimeline>
    </>
  );
};

const CategoryLegend: React.FC = () => {
  const colors = useCategoryColors();
  return (
    <EuiFlexGroup gutterSize="m" wrap responsive={false} justifyContent="center">
      {CATEGORY_ORDER.map((category) => (
        <EuiFlexItem key={category} grow={false}>
          <EuiHealth color={colors[category]} textSize="xs">
            {CATEGORY_LABELS[category]}
          </EuiHealth>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
