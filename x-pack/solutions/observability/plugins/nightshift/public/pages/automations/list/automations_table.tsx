/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEbtProps } from '@kbn/ebt-click';
import React, { useEffect, useState } from 'react';
import {
  Comparators,
  EuiFlexGroup,
  EuiIcon,
  EuiInMemoryTable,
  EuiLoadingSpinner,
  EuiScreenReaderOnly,
  EuiSwitch,
  EuiText,
  EuiToolTip,
  type Criteria,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedRelative } from '@kbn/i18n-react';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../../common/ebt_constants';
import { formatTimestamp } from '../../../common/format_timestamp';
import { useToggleAutomation, type Automation } from '../../../data/automations/use_automations';
import {
  formatChannelValue,
  useAllRelayAppBindings,
} from '../../../data/relay_apps/use_relay_app_bindings';
import { useKibana } from '../../../hooks/use_kibana';
import type { RunCounts, RunCountStatus } from '../hooks/use_automation_usage';
import type { AutomationFacets } from '../utils/filter_automations';
import { getTriggerDisplay } from '../utils/trigger_display';
import { AutomationAuthorCell } from './cells/author_cell';
import { AutomationNameCell } from './cells/name_cell';
import { AutomationActions } from './cells/row_actions';
import { RunCountCell } from './cells/run_count_cell';
import { AutomationUsageCell } from './cells/usage_cell';
import { listLabels, runCountColumns } from './translations';

const INTERACTIVE_ELEMENTS =
  'button, a, input, label, [role="switch"], [role="menu"], [role="dialog"], [role="listbox"]';

export const AutomationsTable = ({
  automations,
  canManage,
  editDisabledReason,
  runCounts,
  lastRuns,
  isLoadingLastRuns,
  usedToday,
  getFacets,
  isRateLimited,
  isGlobalLimitReached = false,
  pageIndex,
  pageSize,
  onPageChange,
  onRun,
  isRunPending,
  onClone,
  onDelete,
  onOpenAutomation,
  onOpenRuns,
  selectedId,
  onOrderChange,
}: {
  automations: Automation[];
  canManage: boolean;
  /** Why the switches are disabled, shown on hover. */
  editDisabledReason?: string;
  runCounts: Map<string, RunCounts>;
  lastRuns?: Record<string, string>;
  isLoadingLastRuns: boolean;
  usedToday: Map<string, number>;
  getFacets: (automation: Automation) => AutomationFacets;
  isRateLimited: (automation: Automation) => boolean;
  isGlobalLimitReached?: boolean;
  pageIndex: number;
  pageSize: number;
  onPageChange: (index: number, size: number) => void;
  onRun: (automation: Automation) => void;
  isRunPending: boolean;
  onClone: (automation: Automation) => void;
  onDelete: (automation: Automation) => void;
  onOpenAutomation: (automation: Automation) => void;
  onOpenRuns: (automation: Automation, status: RunCountStatus) => void;
  selectedId?: string;
  onOrderChange: (ids: string[]) => void;
}) => {
  const toggleAutomation = useToggleAutomation();
  const dateFormat = useKibana().services.uiSettings.get<string>('dateFormat');
  const { bindings } = useAllRelayAppBindings(
    automations.some(({ completions = [] }) =>
      completions.some(
        ({ action, targetMode, destination }) =>
          action === 'post_to_slack' &&
          targetMode === 'channel' &&
          destination &&
          !destination.startsWith('#')
      )
    )
  );
  const [sort, setSort] = useState<{ field: string; direction: 'asc' | 'desc' }>({
    field: 'name',
    direction: 'asc',
  });
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!selectedId) return;
    container
      ?.querySelector(`[data-automation-row="${selectedId}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [container, selectedId]);
  const getAuthorName = (automation: Automation) => getFacets(automation).author;

  const columns: Array<EuiBasicTableColumn<Automation>> = [
    {
      field: 'name',
      name: listLabels.automationColumn,
      sortable: true,
      render: (_name: string, automation: Automation) => (
        <AutomationNameCell automation={automation} onOpen={() => onOpenAutomation(automation)} />
      ),
    },
    {
      field: 'author',
      name: listLabels.author,
      width: '120px',
      sortable: getAuthorName,
      render: (_author: string, automation: Automation) => (
        <AutomationAuthorCell name={getAuthorName(automation)} />
      ),
    },
    {
      name: listLabels.trigger,
      render: ({ trigger }: Automation) => {
        const triggers = new Map(
          trigger.rows.map((row) => {
            const { label, icon } = getTriggerDisplay(row);
            return [label, icon] as const;
          })
        );
        return (
          <EuiFlexGroup
            direction="column"
            alignItems="flexStart"
            gutterSize="xs"
            responsive={false}
          >
            {Array.from(triggers, ([label, icon]) => (
              <EuiFlexGroup
                key={label}
                alignItems="center"
                gutterSize="xs"
                responsive={false}
                css={{ whiteSpace: 'nowrap' }}
              >
                <EuiIcon type={icon} size="s" aria-hidden css={{ flexShrink: 0 }} />
                {label}
              </EuiFlexGroup>
            ))}
          </EuiFlexGroup>
        );
      },
    },
    {
      name: listLabels.destinationColumn,
      render: ({ completions = [], trigger }: Automation) => {
        const destinations = completions.flatMap(({ action, targetMode, destination }) => {
          if (action !== 'post_to_slack') return [];
          if (targetMode === 'channel' && destination) {
            return formatChannelValue(destination, bindings);
          }
          if (targetMode === 'thread' && trigger.rows.some(({ kind }) => kind === 'slack')) {
            return listLabels.slackThreadDestination;
          }
          return [];
        });
        if (destinations.length > 0) {
          return i18n.formatList('unit', [...new Set(destinations)]);
        }

        return (
          <EuiText size="s" color="subdued">
            <span aria-hidden>—</span>
            <EuiScreenReaderOnly>
              <span>{listLabels.noDestination}</span>
            </EuiScreenReaderOnly>
          </EuiText>
        );
      },
    },
    {
      field: 'lastRunAt',
      name: listLabels.lastRunColumn,
      nameTooltip: { content: listLabels.lastRunTooltip },
      sortable: ({ id }) => lastRuns?.[id] ?? '',
      render: (_value: undefined, { id }: Automation) => {
        if (isLoadingLastRuns) return <EuiLoadingSpinner aria-label={listLabels.loadingLastRun} />;
        if (!lastRuns) return listLabels.lastRunUnavailable;
        const lastRunAt = lastRuns[id];
        if (!lastRunAt) return listLabels.noRunsRecorded;
        return (
          <EuiToolTip content={formatTimestamp(lastRunAt, dateFormat)}>
            <time dateTime={lastRunAt} tabIndex={0}>
              <FormattedRelative value={lastRunAt} />
            </time>
          </EuiToolTip>
        );
      },
    },
    ...runCountColumns.map(({ status, name, tooltip, width, getViewLabel }) => ({
      field: `runs-${status}`,
      name,
      nameTooltip: { content: tooltip },
      width,
      align: 'right' as const,
      sortable: (automation: Automation) => runCounts.get(automation.id)?.[status] ?? 0,
      render: (_count: unknown, automation: Automation) => {
        const count = runCounts.get(automation.id)?.[status];
        return (
          <RunCountCell
            count={count}
            viewLabel={getViewLabel(count ?? 0)}
            testSubject={`automationRuns-${status}-${automation.id}`}
            onOpen={() => onOpenRuns(automation, status)}
          />
        );
      },
    })),
    {
      field: 'usage',
      name: listLabels.usage,
      nameTooltip: { content: listLabels.usageTooltip },
      width: '128px',
      align: 'right' as const,
      sortable: (automation) => usedToday.get(automation.id) ?? 0,
      render: (_usage: unknown, automation: Automation) => (
        <AutomationUsageCell
          used={usedToday.get(automation.id)}
          limit={automation.runtime.dailyDispatchLimit}
          isRateLimited={isRateLimited(automation)}
          isGlobalLimitReached={isGlobalLimitReached}
        />
      ),
    },
    {
      field: 'isEnabled',
      name: listLabels.enabled,
      width: '96px',
      sortable: true,
      render: (isEnabled: boolean, automation: Automation) => (
        <EuiToolTip content={editDisabledReason}>
          <EuiSwitch
            label={
              isEnabled
                ? i18n.translate('xpack.nightshift.automations.pauseToggleLabel', {
                    defaultMessage: 'Pause {name}',
                    values: { name: automation.name },
                  })
                : i18n.translate('xpack.nightshift.automations.enableToggleLabel', {
                    defaultMessage: 'Enable {name}',
                    values: { name: automation.name },
                  })
            }
            showLabel={false}
            compressed
            checked={isEnabled}
            disabled={!canManage || toggleAutomation.isLoading}
            {...getEbtProps({
              action: NIGHTSHIFT_EBT_ACTIONS.TOGGLE_AUTOMATION,
              element: NIGHTSHIFT_EBT_ELEMENTS.AUTOMATIONS_LIST,
              detail: isEnabled ? 'pause' : 'enable',
            })}
            onChange={(event) =>
              toggleAutomation.mutate({
                id: automation.id,
                name: automation.name,
                isEnabled: event.target.checked,
              })
            }
            data-test-subj={`automationToggle-${automation.id}`}
          />
        </EuiToolTip>
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
                onRun={() => onRun(automation)}
                isRunPending={isRunPending}
                onClone={() => onClone(automation)}
                onDelete={() => onDelete(automation)}
              />
            ),
          },
        ]
      : []),
  ];

  const sortColumn = columns.find(
    (column) => column.name === sort.field || ('field' in column && column.field === sort.field)
  );
  const sortable = sortColumn && 'sortable' in sortColumn ? sortColumn.sortable : undefined;
  const orderKey = [...automations]
    .sort(
      typeof sortable === 'function'
        ? Comparators.value(sortable, Comparators.default(sort.direction))
        : Comparators.property(sort.field, Comparators.default(sort.direction))
    )
    .map(({ id }) => id)
    .join('|');
  useEffect(() => onOrderChange(orderKey ? orderKey.split('|') : []), [orderKey, onOrderChange]);

  return (
    <div ref={setContainer}>
      <EuiInMemoryTable
        items={automations}
        columns={columns}
        sorting={{ sort }}
        onTableChange={({ sort: nextSort, page }: Criteria<Automation>) => {
          if (nextSort) setSort({ field: String(nextSort.field), direction: nextSort.direction });
          if (page) onPageChange(page.index, page.size);
        }}
        pagination={{ pageIndex, pageSize, pageSizeOptions: [10, 25, 50] }}
        rowHeader="name"
        tableCaption={listLabels.title}
        tableLayout="auto"
        hasBackground={false}
        rowProps={(automation: Automation) => ({
          onClick: (event: React.MouseEvent<HTMLElement>) => {
            const target = event.target as HTMLElement;
            if (!event.currentTarget.contains(target) || target.closest(INTERACTIVE_ELEMENTS))
              return;
            onOpenAutomation(automation);
          },
          isSelected: automation.id === selectedId,
          'data-automation-row': automation.id,
        })}
      />
    </div>
  );
};
