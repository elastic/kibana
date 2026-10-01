/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiAvatar,
  EuiBadge,
  EuiBadgeGroup,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiConfirmModal,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIconTip,
  EuiInMemoryTable,
  EuiLink,
  EuiLoadingSpinner,
  EuiPopover,
  EuiPopoverFooter,
  EuiProgress,
  EuiSelectable,
  EuiSpacer,
  EuiSuperDatePicker,
  EuiSwitch,
  EuiText,
  EuiToolTip,
  useEuiI18n,
  useEuiTheme,
  type EuiBasicTableColumn,
  type EuiSelectableOption,
} from '@elastic/eui';
import { css } from '@emotion/react';
import datemath from '@elastic/datemath';
import { i18n } from '@kbn/i18n';
import { getNightshiftCapabilities } from '@kbn/nightshift-shared';
import { RETRY_BUTTON_LABEL } from '../common/messages';
import {
  AUTOMATIONS_LOAD_ERROR_TITLE,
  useAutomationRunsInRange,
  useAutomationsRunsInRange,
  useDeleteAutomation,
  useFetchAutomations,
  useToggleAutomation,
  type Automation,
} from '../hooks/use_automations';
import { useKibana } from '../hooks/use_kibana';
import { CreateAutomationFlyout } from './create_automation_flyout';

const labels = {
  title: i18n.translate('xpack.nightshift.automations.pageTitle', {
    defaultMessage: 'Automations',
  }),
  create: i18n.translate('xpack.nightshift.automations.createButton', {
    defaultMessage: 'Create automation',
  }),
  search: i18n.translate('xpack.nightshift.automations.search', {
    defaultMessage: 'Search automations',
  }),
  status: i18n.translate('xpack.nightshift.automations.statusFilter', { defaultMessage: 'Status' }),
  tag: i18n.translate('xpack.nightshift.automations.tagFilter', { defaultMessage: 'Tag' }),
  author: i18n.translate('xpack.nightshift.automations.authorFilter', { defaultMessage: 'Author' }),
  trigger: i18n.translate('xpack.nightshift.automations.triggerFilter', {
    defaultMessage: 'Trigger',
  }),
  automationColumn: i18n.translate('xpack.nightshift.automations.automationColumn', {
    defaultMessage: 'Automations',
  }),
  active: i18n.translate('xpack.nightshift.automations.activeColumn', {
    defaultMessage: 'Active',
  }),
  viewRuns: i18n.translate('xpack.nightshift.automations.viewRuns', {
    defaultMessage: 'View runs',
  }),
  limitReached: i18n.translate('xpack.nightshift.automations.limitReached', {
    defaultMessage: 'Daily trigger limit reached for today',
  }),
  runs: i18n.translate('xpack.nightshift.automations.runsColumn', { defaultMessage: 'Runs' }),
  runsTooltip: i18n.translate('xpack.nightshift.automations.runsColumnTooltip', {
    defaultMessage:
      'Runs started at the selected time range. Triggers skipped by the Daily trigger limit are not counted.',
  }),
  usage: i18n.translate('xpack.nightshift.automations.usageColumn', {
    defaultMessage: "Today's usage",
  }),
  usageTooltip: i18n.translate('xpack.nightshift.automations.usageColumnTooltip', {
    defaultMessage:
      'Triggers used today of out the Daily trigger limit set on the automation. Resets at midnight (UTC).',
  }),
  any: i18n.translate('xpack.nightshift.automations.anyFilter', { defaultMessage: 'Any' }),
  last48Hours: i18n.translate('xpack.nightshift.automations.last48Hours', {
    defaultMessage: 'Last 48 hours',
  }),
  alert: i18n.translate('xpack.nightshift.automations.alertLabel', { defaultMessage: 'Alert' }),
  schedule: i18n.translate('xpack.nightshift.automations.scheduleLabel', {
    defaultMessage: 'Schedule',
  }),
  clone: i18n.translate('xpack.nightshift.automations.cloneAction', { defaultMessage: 'Clone' }),
  delete: i18n.translate('xpack.nightshift.automations.deleteAction', { defaultMessage: 'Delete' }),
  cancel: i18n.translate('xpack.nightshift.automations.cancelButton', { defaultMessage: 'Cancel' }),
  deleteBody: i18n.translate('xpack.nightshift.automations.deleteConfirmBody', {
    defaultMessage:
      "This automation and its backing workflow will be deleted. You can't undo this action.",
  }),
  emptyTitle: i18n.translate('xpack.nightshift.automations.emptyTitle', {
    defaultMessage: 'Automations run on triggers you define',
  }),
  emptyBody: i18n.translate('xpack.nightshift.automations.emptyBody', {
    defaultMessage:
      'Create an automation to start a Nightshift investigation automatically when an alert changes status.',
  }),
  filteredEmptyTitle: i18n.translate('xpack.nightshift.automations.filteredEmptyTitle', {
    defaultMessage: 'No matching automations',
  }),
  filteredEmptyBody: i18n.translate('xpack.nightshift.automations.filteredEmptyBody', {
    defaultMessage: 'Try clearing search or filters.',
  }),
  clearSelection: i18n.translate('xpack.nightshift.automations.clearSelection', {
    defaultMessage: 'Clear selection',
  }),
  findTag: i18n.translate('xpack.nightshift.automations.findTag', {
    defaultMessage: 'Find tag...',
  }),
  findAuthor: i18n.translate('xpack.nightshift.automations.findAuthor', {
    defaultMessage: 'Find author...',
  }),
  clearFilters: i18n.translate('xpack.nightshift.automations.clearFilters', {
    defaultMessage: 'Clear filters',
  }),
};

const openAutomation = () => {};

const getAutomationTags = (automation: Automation): string[] =>
  automation.trigger.rows.flatMap((row) => ('tags' in row ? row.tags ?? [] : []));

const AutomationTags = ({ tags }: { tags: string[] }) => (
  <EuiToolTip
    content={
      <EuiBadgeGroup gutterSize="xs">
        {tags.map((tag) => (
          <EuiBadge key={tag} color="hollow">
            {tag}
          </EuiBadge>
        ))}
      </EuiBadgeGroup>
    }
  >
    <EuiBadge
      color="hollow"
      iconType="tag"
      tabIndex={0}
      aria-label={i18n.translate('xpack.nightshift.automations.tagsCount', {
        defaultMessage: '{count} tags',
        values: { count: tags.length },
      })}
      data-test-subj="automationTags"
    >
      {tags.length}
    </EuiBadge>
  </EuiToolTip>
);

const getDeleteConfirmTitle = (name: string) =>
  i18n.translate('xpack.nightshift.automations.deleteConfirmTitle', {
    defaultMessage: 'Delete "{name}"?',
    values: { name },
  });

const SPARKLINE_WIDTH = 72;
const SPARKLINE_HEIGHT = 16;
const SPARKLINE_BUCKETS = 12;
const FAILED_RUN_STATUSES = new Set(['failed', 'cancelled', 'timed_out']);

const toSparklinePath = (values: number[], max: number): string => {
  const step = SPARKLINE_WIDTH / (values.length - 1);
  const points = values.map((value, index) => ({
    x: index * step,
    y: SPARKLINE_HEIGHT - 1 - (value / max) * (SPARKLINE_HEIGHT - 2),
  }));
  return points
    .map(({ x, y }, index) => {
      if (index === 0) return `M${x},${y}`;
      const previous = points[index - 1];
      const midX = (previous.x + x) / 2;
      return `C${midX},${previous.y} ${midX},${y} ${x},${y}`;
    })
    .join(' ');
};

const RunsSparkline = ({
  runs,
  startedAfter,
  startedBefore,
}: {
  runs: Array<{ status: string; startedAt?: string }>;
  startedAfter: string;
  startedBefore: string;
}) => {
  const { euiTheme } = useEuiTheme();
  const start = Date.parse(startedAfter);
  const span = Date.parse(startedBefore) - start;
  const series = [
    {
      color: euiTheme.colors.vis.euiColorVisSuccess0,
      matches: (status: string) => status === 'completed',
    },
    {
      color: euiTheme.colors.vis.euiColorVisDanger0,
      matches: (status: string) => FAILED_RUN_STATUSES.has(status),
    },
    {
      color: euiTheme.colors.vis.euiColorVis1,
      matches: (status: string) => status !== 'completed' && !FAILED_RUN_STATUSES.has(status),
    },
  ].map(({ color, matches }) => {
    const buckets = new Array<number>(SPARKLINE_BUCKETS).fill(0);
    runs.forEach(({ status, startedAt }) => {
      if (!startedAt || !matches(status)) return;
      const bucket = Math.floor(((Date.parse(startedAt) - start) / span) * SPARKLINE_BUCKETS);
      buckets[Math.min(Math.max(bucket, 0), SPARKLINE_BUCKETS - 1)] += 1;
    });
    return { color, buckets };
  });
  const max = Math.max(1, ...series.flatMap(({ buckets }) => buckets));

  return (
    <svg
      aria-hidden="true"
      width={SPARKLINE_WIDTH}
      height={SPARKLINE_HEIGHT}
      viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
    >
      {series.map(({ color, buckets }, index) => {
        if (index > 0 && buckets.every((count) => count === 0)) return null;
        const line = toSparklinePath(buckets, max);
        return (
          <g key={color}>
            <path
              d={`${line} L${SPARKLINE_WIDTH},${SPARKLINE_HEIGHT} L0,${SPARKLINE_HEIGHT} Z`}
              fill={color}
              fillOpacity={0.2}
            />
            <path d={line} fill="none" stroke={color} strokeWidth={1.5} />
          </g>
        );
      })}
    </svg>
  );
};

const AutomationRunsCell = ({
  id,
  startedAfter,
  startedBefore,
}: {
  id: string;
  startedAfter: string;
  startedBefore: string;
}) => {
  const { data, isInitialLoading } = useAutomationRunsInRange(id, startedAfter, startedBefore);

  if (isInitialLoading) {
    return <EuiLoadingSpinner size="s" />;
  }

  if (!data?.total) {
    return <EuiText size="s">0</EuiText>;
  }

  return (
    <EuiToolTip content={labels.viewRuns}>
      <EuiLink
        data-test-subj="automationRuns"
        color="primary"
        onClick={(event: React.MouseEvent) => event.stopPropagation()}
      >
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <strong>{data.total}</strong>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <RunsSparkline
              runs={data.runs}
              startedAfter={startedAfter}
              startedBefore={startedBefore}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiLink>
    </EuiToolTip>
  );
};

interface FilterOption {
  label: string;
  count: number;
  prepend?: React.ReactNode;
}

const countFilterValues = (valuesPerAutomation: string[][]): FilterOption[] => {
  const counts = new Map<string, number>();
  valuesPerAutomation.forEach((values) =>
    new Set(values).forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1))
  );
  return [...counts]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
};

const AutomationFilter = ({
  label,
  options,
  selected,
  onChange,
  testSubject,
  searchPlaceholder,
}: {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  testSubject: string;
  searchPlaceholder?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { euiTheme } = useEuiTheme();
  const selectableOptions: Array<EuiSelectableOption<string>> = options.map(
    ({ label: option, count, prepend }) =>
      ({
        label: option,
        prepend,
        append: (
          <EuiText size="xs" color="subdued">
            {count}
          </EuiText>
        ),
        checked: selected.includes(option) ? 'on' : undefined,
      } as EuiSelectableOption<string>)
  );
  const handleChange = (nextOptions: Array<EuiSelectableOption<string>>) =>
    onChange(
      nextOptions.filter(({ checked }) => checked === 'on').map(({ label: value }) => value)
    );
  const renderContent = (list: React.ReactNode, search?: React.ReactNode) => (
    <div css={{ width: 240 }}>
      {search && <div css={{ padding: euiTheme.size.s }}>{search}</div>}
      {list}
      {selected.length > 0 && (
        <EuiPopoverFooter paddingSize="s">
          <EuiButtonEmpty
            data-test-subj="nightshiftAutomationFilterClearSelection"
            size="xs"
            flush="both"
            onClick={() => onChange([])}
          >
            {labels.clearSelection}
          </EuiButtonEmpty>
        </EuiPopoverFooter>
      )}
    </div>
  );

  return (
    <EuiPopover
      aria-label={label}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      button={
        <EuiFilterButton
          onClick={() => setIsOpen((open) => !open)}
          isSelected={isOpen}
          hasActiveFilters={selected.length > 0}
          numActiveFilters={selected.length || undefined}
          numFilters={options.length}
          data-test-subj={testSubject}
        >
          {label}
        </EuiFilterButton>
      }
    >
      {searchPlaceholder ? (
        <EuiSelectable
          aria-label={label}
          searchable
          searchProps={{ placeholder: searchPlaceholder }}
          options={selectableOptions}
          onChange={handleChange}
          listProps={{ bordered: false }}
        >
          {(list, search) => renderContent(list, search)}
        </EuiSelectable>
      ) : (
        <EuiSelectable
          aria-label={label}
          options={selectableOptions}
          onChange={handleChange}
          listProps={{ bordered: false }}
        >
          {(list) => renderContent(list)}
        </EuiSelectable>
      )}
    </EuiPopover>
  );
};

export const AutomationsPage = (): React.ReactElement => {
  const { services } = useKibana();
  const canManage = getNightshiftCapabilities(
    services.application.capabilities.nightshift
  ).canManage;
  const { data, error, isInitialLoading, refetch } = useFetchAutomations();
  const toggleAutomation = useToggleAutomation();
  const deleteAutomation = useDeleteAutomation();
  const [isCreateFlyoutOpen, setIsCreateFlyoutOpen] = useState(false);
  const [automationToClone, setAutomationToClone] = useState<Automation | undefined>();
  const [automationToDelete, setAutomationToDelete] = useState<Automation | undefined>();
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedAuthors, setSelectedAuthors] = useState<string[]>([]);
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [range, setRange] = useState({ start: 'now-48h', end: 'now' });
  const automations = useMemo(() => data?.automations ?? [], [data?.automations]);
  const runRange = useMemo(
    () => ({
      startedAfter: datemath.parse(range.start)?.toISOString() ?? range.start,
      startedBefore: datemath.parse(range.end, { roundUp: true })?.toISOString() ?? range.end,
    }),
    [range]
  );
  const runQueries = useAutomationsRunsInRange(
    automations.map(({ id }) => id),
    runRange.startedAfter,
    runRange.startedBefore
  );
  const runTotals = new Map(
    automations.map(({ id }, index) => [id, runQueries[index]?.data?.total ?? 0])
  );
  const today = useMemo(() => {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { startedAfter: start.toISOString(), startedBefore: end.toISOString() };
  }, []);
  const todayQueries = useAutomationsRunsInRange(
    automations.map(({ id }) => id),
    today.startedAfter,
    today.startedBefore
  );
  const usedToday = new Map(
    automations.map(({ id }, index) => [id, todayQueries[index]?.data?.total ?? 0])
  );
  const statuses = useMemo(
    () => countFilterValues(automations.map(({ isEnabled }) => [isEnabled ? 'Active' : 'Paused'])),
    [automations]
  );
  const tags = useMemo(() => countFilterValues(automations.map(getAutomationTags)), [automations]);
  const authors = useMemo(
    () =>
      countFilterValues(automations.map(({ author }) => [author.username])).map((option) => ({
        ...option,
        prepend: <EuiAvatar size="s" name={option.label} />,
      })),
    [automations]
  );
  const triggers = useMemo(
    () =>
      countFilterValues(
        automations.map(({ trigger }) =>
          trigger.rows.map(({ kind }) => (kind === 'schedule' ? labels.schedule : labels.alert))
        )
      ).map((option) => ({
        ...option,
        prepend: (
          <EuiIcon
            type={option.label === labels.schedule ? 'calendar' : 'logoSlack'}
            aria-hidden={true}
          />
        ),
      })),
    [automations]
  );
  const hasFilters = Boolean(
    search ||
      selectedStatus.length ||
      selectedTags.length ||
      selectedAuthors.length ||
      selectedTriggers.length
  );
  const visibleAutomations = useMemo(
    () =>
      automations.filter((automation) => {
        const query = search.trim().toLowerCase();
        const matchesSearch =
          !query ||
          [
            automation.name,
            automation.description ?? '',
            ...automation.trigger.rows.flatMap((row) => ('tags' in row ? row.tags ?? [] : [])),
          ].some((value) => value.toLowerCase().includes(query));
        const matchesStatus =
          selectedStatus.length === 0 ||
          selectedStatus.includes(automation.isEnabled ? 'Active' : 'Paused');
        const matchesTags =
          selectedTags.length === 0 ||
          automation.trigger.rows.some(
            (row) => 'tags' in row && (row.tags ?? []).some((tag) => selectedTags.includes(tag))
          );
        const matchesAuthors =
          selectedAuthors.length === 0 || selectedAuthors.includes(automation.author.username);
        const matchesTriggers =
          selectedTriggers.length === 0 ||
          automation.trigger.rows.some((row) =>
            selectedTriggers.includes(row.kind === 'schedule' ? labels.schedule : labels.alert)
          );
        return matchesSearch && matchesStatus && matchesTags && matchesAuthors && matchesTriggers;
      }),
    [automations, search, selectedAuthors, selectedStatus, selectedTags, selectedTriggers]
  );

  const columns: Array<EuiBasicTableColumn<Automation>> = [
    {
      field: 'name',
      name: labels.automationColumn,
      sortable: true,
      render: (_name: string, automation: Automation) => (
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon
              type={automation.trigger.rows[0]?.kind === 'schedule' ? 'calendar' : 'logoSlack'}
              size="m"
              aria-hidden={true}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLink
              data-test-subj="nightshiftAutomationName"
              color="primary"
              onClick={openAutomation}
            >
              {automation.name}
            </EuiLink>
          </EuiFlexItem>
          {getAutomationTags(automation).length > 0 && (
            <EuiFlexItem grow={false}>
              <AutomationTags tags={getAutomationTags(automation)} />
            </EuiFlexItem>
          )}
          {automation.runtime.dailyDispatchLimit !== undefined &&
            (usedToday.get(automation.id) ?? 0) >= automation.runtime.dailyDispatchLimit && (
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  type="hourglass"
                  color="danger"
                  content={labels.limitReached}
                  aria-label={labels.limitReached}
                  iconProps={{ 'data-test-subj': 'automationLimitReached' }}
                />
              </EuiFlexItem>
            )}
        </EuiFlexGroup>
      ),
    },
    {
      field: 'isEnabled',
      name: labels.active,
      width: '96px',
      sortable: true,
      render: (isEnabled: boolean, automation: Automation) => (
        <EuiSwitch
          label={i18n.translate('xpack.nightshift.automations.toggleLabel', {
            defaultMessage: '{action} {name}',
            values: { action: isEnabled ? 'Pause' : 'Activate', name: automation.name },
          })}
          showLabel={false}
          compressed
          checked={isEnabled}
          disabled={!canManage || toggleAutomation.isLoading}
          onChange={(event) =>
            toggleAutomation.mutate({ id: automation.id, isEnabled: event.target.checked })
          }
          data-test-subj={`automationToggle-${automation.id}`}
        />
      ),
    },
    {
      name: labels.author,
      width: '160px',
      sortable: (automation) => automation.author.username,
      render: (automation: Automation) => <AutomationAuthorCell automation={automation} />,
    },
    {
      name: labels.runs,
      nameTooltip: { content: labels.runsTooltip },
      width: '170px',
      sortable: (automation) => runTotals.get(automation.id) ?? 0,
      render: (automation: Automation) => <AutomationRunsCell id={automation.id} {...runRange} />,
    },
    {
      name: labels.usage,
      nameTooltip: { content: labels.usageTooltip },
      width: '180px',
      sortable: (automation) => usedToday.get(automation.id) ?? 0,
      render: (automation: Automation) => (
        <AutomationUsageCell
          used={usedToday.get(automation.id) ?? 0}
          limit={automation.runtime.dailyDispatchLimit}
        />
      ),
    },
    ...(canManage
      ? [
          {
            name: '',
            width: '40px',
            align: 'right' as const,
            render: (automation: Automation) => (
              <AutomationActions
                automation={automation}
                onClone={() => setAutomationToClone(automation)}
                onDelete={() => setAutomationToDelete(automation)}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <EuiFlexGroup gutterSize="s" responsive={false} wrap>
        <EuiFlexItem grow={true} css={css({ minWidth: 240 })}>
          <EuiFieldSearch
            placeholder={labels.search}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            isClearable
            fullWidth
            data-test-subj="automationsSearch"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFilterGroup>
            <AutomationFilter
              label={labels.status}
              options={statuses}
              selected={selectedStatus}
              onChange={setSelectedStatus}
              testSubject="automationStatusFilter"
            />
            <AutomationFilter
              label={labels.tag}
              options={tags}
              searchPlaceholder={labels.findTag}
              selected={selectedTags}
              onChange={setSelectedTags}
              testSubject="automationTagFilter"
            />
            <AutomationFilter
              label={labels.author}
              options={authors}
              searchPlaceholder={labels.findAuthor}
              selected={selectedAuthors}
              onChange={setSelectedAuthors}
              testSubject="automationAuthorFilter"
            />
            <AutomationFilter
              label={labels.trigger}
              options={triggers}
              selected={selectedTriggers}
              onChange={setSelectedTriggers}
              testSubject="automationTriggerFilter"
            />
          </EuiFilterGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSuperDatePicker
            start={range.start}
            end={range.end}
            showUpdateButton={false}
            width="auto"
            commonlyUsedRanges={[
              { start: 'now-48h', end: 'now', label: labels.last48Hours },
              { start: 'now-24h', end: 'now', label: 'Last 24 hours' },
              { start: 'now-7d', end: 'now', label: 'Last 7 days' },
              { start: 'now-30d', end: 'now', label: 'Last 30 days' },
            ]}
            onTimeChange={({ start, end }) => setRange({ start, end })}
            onRefresh={({ start, end }) => setRange({ start, end })}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {canManage && (
            <EuiButton
              data-test-subj="nightshiftAutomationsPageButton"
              fill
              iconType="plus"
              onClick={() => setIsCreateFlyoutOpen(true)}
            >
              {labels.create}
            </EuiButton>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.nightshift.automations.showingCount', {
              defaultMessage: 'Showing {count} automations',
              values: { count: visibleAutomations.length },
            })}
          </EuiText>
        </EuiFlexItem>
        {hasFilters && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="nightshiftAutomationsPageButton"
              size="xs"
              onClick={() => {
                setSearch('');
                setSelectedStatus([]);
                setSelectedTags([]);
                setSelectedAuthors([]);
                setSelectedTriggers([]);
              }}
            >
              {labels.clearFilters}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {isInitialLoading ? (
        <EuiLoadingSpinner size="l" />
      ) : error && !data ? (
        <EuiCallOut announceOnMount color="danger" iconType="warning">
          <p>{AUTOMATIONS_LOAD_ERROR_TITLE}</p>
          <EuiButton
            data-test-subj="nightshiftAutomationsPageButton"
            color="danger"
            onClick={() => refetch()}
            iconType="refresh"
            size="s"
          >
            {RETRY_BUTTON_LABEL}
          </EuiButton>
        </EuiCallOut>
      ) : visibleAutomations.length === 0 ? (
        hasFilters ? (
          <EuiEmptyPrompt
            title={<h2>{labels.filteredEmptyTitle}</h2>}
            body={<p>{labels.filteredEmptyBody}</p>}
            actions={
              <EuiButton
                data-test-subj="nightshiftAutomationsPageButton"
                onClick={() => {
                  setSearch('');
                  setSelectedStatus([]);
                  setSelectedTags([]);
                  setSelectedAuthors([]);
                  setSelectedTriggers([]);
                }}
              >
                {labels.clearFilters}
              </EuiButton>
            }
          />
        ) : (
          <EuiEmptyPrompt
            title={<h2>{labels.emptyTitle}</h2>}
            body={<p>{labels.emptyBody}</p>}
            actions={
              canManage ? (
                <EuiButton
                  data-test-subj="nightshiftAutomationsPageButton"
                  fill
                  onClick={() => setIsCreateFlyoutOpen(true)}
                >
                  {labels.create}
                </EuiButton>
              ) : undefined
            }
          />
        )
      ) : (
        <EuiInMemoryTable
          items={visibleAutomations}
          columns={columns}
          sorting={{ sort: { field: 'name', direction: 'asc' } }}
          rowHeader="name"
          tableCaption={labels.title}
          tableLayout="auto"
          hasBackground={false}
          rowProps={{ onClick: openAutomation }}
        />
      )}
      {isCreateFlyoutOpen && (
        <CreateAutomationFlyout onClose={() => setIsCreateFlyoutOpen(false)} />
      )}
      {automationToClone && (
        <CreateAutomationFlyout
          automation={automationToClone}
          onClose={() => setAutomationToClone(undefined)}
        />
      )}
      {automationToDelete && (
        <EuiConfirmModal
          title={getDeleteConfirmTitle(automationToDelete.name)}
          onCancel={() => setAutomationToDelete(undefined)}
          onConfirm={() =>
            deleteAutomation.mutate(automationToDelete.id, {
              onSuccess: () => setAutomationToDelete(undefined),
            })
          }
          cancelButtonText={labels.cancel}
          confirmButtonText={labels.delete}
          buttonColor="danger"
          isLoading={deleteAutomation.isLoading}
          aria-label={getDeleteConfirmTitle(automationToDelete.name)}
        >
          <p>{labels.deleteBody}</p>
        </EuiConfirmModal>
      )}
    </>
  );
};

const AutomationUsageCell = ({ used, limit }: { used: number; limit?: number }) => {
  const { euiTheme } = useEuiTheme();
  if (limit === undefined) return <>—</>;

  const color = used >= limit ? 'danger' : 'success';
  return (
    <div css={{ width: '100%' }}>
      <EuiToolTip
        display="block"
        content={
          used >= limit
            ? i18n.translate('xpack.nightshift.automations.usageCellLimitReachedTooltip', {
                defaultMessage: 'Daily limit reached · no more runs until midnight (UTC)',
              })
            : i18n.translate('xpack.nightshift.automations.usageCellTooltip', {
                defaultMessage: '{used} of {limit} triggers used today · resets at midnight (UTC)',
                values: { used, limit },
              })
        }
      >
        <div data-test-subj="automationUsage" tabIndex={0}>
          <EuiProgress
            label={
              <EuiText
                size="xs"
                color={color === 'danger' ? 'danger' : undefined}
                css={{ marginBlockEnd: euiTheme.size.xs }}
              >
                {used} / {limit}
              </EuiText>
            }
            value={Math.min(used, limit)}
            max={limit}
            size="s"
            color={color}
          />
        </div>
      </EuiToolTip>
    </div>
  );
};

const AutomationAuthorCell = ({ automation }: { automation: Automation }) => {
  const { username } = automation.author;

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiAvatar size="s" name={username} />
      </EuiFlexItem>
      <EuiFlexItem className="eui-textTruncate">{username}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

const AutomationActions = ({
  automation,
  onClone,
  onDelete,
}: {
  automation: Automation;
  onClone: () => void;
  onDelete: () => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const allActionsLabel = useEuiI18n('euiCollapsedItemActions.allActionsTooltip', 'All actions');

  return (
    <EuiPopover
      aria-label={allActionsLabel}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      anchorPosition="leftCenter"
      button={
        <EuiToolTip content={allActionsLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="boxesVertical"
            color="primary"
            aria-label={allActionsLabel}
            onClick={() => setIsOpen((open) => !open)}
            data-test-subj={`automationActions-${automation.id}`}
          />
        </EuiToolTip>
      }
    >
      <EuiContextMenuPanel
        items={[
          <EuiContextMenuItem
            key="clone"
            icon="copy"
            onClick={() => {
              setIsOpen(false);
              onClone();
            }}
            data-test-subj="cloneAutomation"
          >
            {labels.clone}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="delete"
            icon="trash"
            color="danger"
            onClick={() => {
              setIsOpen(false);
              onDelete();
            }}
            data-test-subj="deleteAutomation"
          >
            {labels.delete}
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
};
