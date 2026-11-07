/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import {
  EuiBadge,
  EuiBasicTable,
  EuiFieldSearch,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTextBlockTruncate,
  useEuiTheme,
  type Criteria,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import type { InvestigationSummary } from '@kbn/agentic-investigations-plugin/common';
import { i18n } from '@kbn/i18n';
import { FormattedRelative } from '@kbn/i18n-react';
import {
  buildNightshiftInvestigationFlyoutShareUrl,
  clearNightshiftInvestigationIdParam,
  getNightshiftInvestigationIdFromSearch,
  setNightshiftInvestigationIdParam,
} from '../../common/url_params';
import { InvestigationCardActions } from '../../components/entities/investigation/investigation_card_actions';
import { FilterPopover } from '../../components/ui/filter_popover';
import { useFlyoutShareUrlCustomAction } from '../../components/ui/flyout_share_url_button';
import {
  SeverityBadge,
  SIGNIFICANT_EVENT_SEVERITY,
} from '../../components/ui/severity_badge';
import { NightshiftTimeRangePicker } from '../../components/ui/time_range_picker';
import { matchesInvestigationUpdatedAtRange } from '../../data/investigations/investigation_time_range';
import {
  buildInvestigationsSearch,
  INVESTIGATIONS_SEVERITY_OPTIONS,
  INVESTIGATIONS_STATE_OPTIONS,
  parseInvestigationsSearch,
  type InvestigationsSeverityFilter,
  type InvestigationsStateFilter,
  type InvestigationsUrlState,
} from '../../data/investigations/investigations_url';
import { useFetchInvestigations } from '../../data/investigations/use_fetch_investigations';
import { useKibana } from '../../hooks/use_kibana';
import { InvestigationsHistogram } from './investigations_histogram';
import { type InvestigationsHistogramBreakdown } from './investigations_histogram_series';
import {
  DEFAULT_INVESTIGATIONS_TABLE_SORT,
  isInvestigationsTableSortField,
  sortInvestigationsForTable,
  type InvestigationsTableSort,
} from './investigations_table_sort';

const SEVERITY_FILTER_LABEL = i18n.translate(
  'xpack.nightshift.investigationsPage.severityFilterLabel',
  { defaultMessage: 'Severity' }
);

const STATE_FILTER_LABEL = i18n.translate('xpack.nightshift.investigationsPage.stateFilterLabel', {
  defaultMessage: 'State',
});

const STATE_FILTER_LABELS: Record<InvestigationsStateFilter, string> = {
  open: i18n.translate('xpack.nightshift.investigationsPage.stateOpen', {
    defaultMessage: 'Open',
  }),
  closed: i18n.translate('xpack.nightshift.investigationsPage.stateClosed', {
    defaultMessage: 'Closed',
  }),
};

const STATE_FILTER_ICON_COLOR: Record<InvestigationsStateFilter, 'primary' | 'success'> = {
  open: 'primary',
  closed: 'success',
};

/** List state only — `in_progress` is a Home label; those rows are Open here. */
const investigationState = (
  investigation: InvestigationSummary
): InvestigationsStateFilter => {
  if (investigation.metadata.status === 'closed') {
    return 'closed';
  }
  return 'open';
};

const stateLabel = (
  state: InvestigationsStateFilter
): { label: string; color: 'default' | 'success' } => {
  switch (state) {
    case 'closed':
      return { label: 'Closed', color: 'success' };
    case 'open':
      return { label: 'Open', color: 'default' };
  }
};

const matchesSeverity = (
  investigation: InvestigationSummary,
  severity: InvestigationsSeverityFilter[]
): boolean => {
  if (severity.length === 0) {
    return true;
  }
  const value: InvestigationsSeverityFilter = investigation.metadata.severity ?? 'none';
  return severity.includes(value);
};

const matchesState = (
  investigation: InvestigationSummary,
  state: InvestigationsStateFilter[]
): boolean => {
  if (state.length === 0) {
    return true;
  }
  return state.includes(investigationState(investigation));
};

/** Enough rows for the Investigations table so the time picker can filter client-side. */
const INVESTIGATIONS_PAGE_FETCH_SIZE = 100;

export function InvestigationsPage(): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const { agentBuilder } = useKibana().services;
  const history = useHistory();
  const { search } = useLocation();
  const urlState = useMemo(() => parseInvestigationsSearch(search), [search]);
  const [draftQuery, setDraftQuery] = useState(urlState.query);
  const [breakdown, setBreakdown] = useState<InvestigationsHistogramBreakdown>('none');
  const [sort, setSort] = useState<InvestigationsTableSort>(DEFAULT_INVESTIGATIONS_TABLE_SORT);
  const selectedInvestigationId = useMemo(
    () => getNightshiftInvestigationIdFromSearch(search),
    [search]
  );

  const replaceUrl = useCallback(
    (next: InvestigationsUrlState) => {
      const params = new URLSearchParams(buildInvestigationsSearch(next).replace(/^\?/, ''));
      // Keep an open flyout across filter changes.
      if (selectedInvestigationId) {
        setNightshiftInvestigationIdParam(params, selectedInvestigationId);
      }
      history.replace({ search: params.toString() });
    },
    [history, selectedInvestigationId]
  );

  // Newest-by-update first; severity/state/time (last update) filtered client-side for the demo.
  const openList = useFetchInvestigations({
    inProgress: false,
    status: 'open',
    query: urlState.query || undefined,
    sortField: 'updated_at',
    perPage: INVESTIGATIONS_PAGE_FETCH_SIZE,
  });
  const closedList = useFetchInvestigations({
    inProgress: false,
    status: 'closed',
    query: urlState.query || undefined,
    sortField: 'updated_at',
    perPage: INVESTIGATIONS_PAGE_FETCH_SIZE,
  });
  const inProgressList = useFetchInvestigations({
    inProgress: true,
    status: 'open',
    query: urlState.query || undefined,
    sortField: 'updated_at',
  });

  const filteredByAttributes = useMemo(() => {
    const seen = new Set<string>();
    const combined: InvestigationSummary[] = [];
    for (const list of [inProgressList, openList, closedList]) {
      for (const investigation of list.investigations) {
        if (seen.has(investigation.id)) {
          continue;
        }
        seen.add(investigation.id);
        combined.push(investigation);
      }
    }
    return combined.filter(
      (investigation) =>
        matchesSeverity(investigation, urlState.severity) &&
        matchesState(investigation, urlState.state)
    );
  }, [
    closedList.investigations,
    inProgressList.investigations,
    openList.investigations,
    urlState.severity,
    urlState.state,
  ]);

  const rows = useMemo(() => {
    const inRange = filteredByAttributes.filter((investigation) =>
      matchesInvestigationUpdatedAtRange(investigation, urlState.rangeFrom, urlState.rangeTo)
    );
    return sortInvestigationsForTable(inRange, sort);
  }, [filteredByAttributes, sort, urlState.rangeFrom, urlState.rangeTo]);

  const handleTableChange = useCallback(({ sort: nextSort }: Criteria<InvestigationSummary>) => {
    if (!nextSort || !isInvestigationsTableSortField(nextSort.field)) {
      return;
    }
    setSort({ field: nextSort.field, direction: nextSort.direction });
  }, []);

  const stateOf = useCallback(
    (investigation: InvestigationSummary) => investigationState(investigation),
    []
  );

  const openInvestigation = useCallback(
    (investigation: InvestigationSummary) => {
      const params = new URLSearchParams(history.location.search);
      setNightshiftInvestigationIdParam(params, investigation.id);
      history.replace({ search: params.toString() });
    },
    [history]
  );

  const handleFlyoutClose = useCallback(() => {
    const params = new URLSearchParams(history.location.search);
    clearNightshiftInvestigationIdParam(params);
    history.replace({ search: params.toString() });
  }, [history]);

  const getInvestigationShareUrl = useCallback(
    () =>
      selectedInvestigationId
        ? buildNightshiftInvestigationFlyoutShareUrl(selectedInvestigationId)
        : window.location.href,
    [selectedInvestigationId]
  );
  const shareInvestigationAction = useFlyoutShareUrlCustomAction(getInvestigationShareUrl);

  // Same as Home: `?investigationId=` opens the Agent Builder conversation details flyout.
  useEffect(() => {
    if (!selectedInvestigationId || !agentBuilder) {
      return;
    }
    let closeFlyout: (() => void) | undefined;
    let isCancelled = false;
    void agentBuilder
      .openConversationDetails({
        conversationId: selectedInvestigationId,
        trailingActions: [shareInvestigationAction],
        onClose: () => {
          if (!isCancelled) {
            handleFlyoutClose();
          }
        },
      })
      .then((close) => {
        if (isCancelled) {
          close();
        } else {
          closeFlyout = close;
        }
      });
    return () => {
      isCancelled = true;
      closeFlyout?.();
    };
  }, [agentBuilder, handleFlyoutClose, selectedInvestigationId, shareInvestigationAction]);

  const columns: Array<EuiBasicTableColumn<InvestigationSummary>> = [
    {
      field: 'title',
      name: i18n.translate('xpack.nightshift.investigationsPage.nameColumn', {
        defaultMessage: 'Name',
      }),
      // Match detections: title + subdued summary, truncated when the flyout narrows the page.
      truncateText: true,
      sortable: true,
      render: (title: string, investigation: InvestigationSummary) => {
        const label = title || investigation.id;
        const summary = investigation.metadata.summary;
        return (
          <div
            data-test-subj={`nightshiftInvestigationsPageOpen-${investigation.id}`}
            css={css`
              padding-block: ${euiTheme.size.s};
              min-width: 0;
            `}
          >
            <EuiText size="s">
              <EuiTextBlockTruncate lines={2} cloneElement>
                <strong title={label}>{label}</strong>
              </EuiTextBlockTruncate>
            </EuiText>
            {summary ? (
              <EuiText size="xs" color="subdued">
                <EuiTextBlockTruncate lines={2} title={summary}>
                  {summary}
                </EuiTextBlockTruncate>
              </EuiText>
            ) : null}
          </div>
        );
      },
    },
    {
      field: 'state',
      name: i18n.translate('xpack.nightshift.investigationsPage.stateColumn', {
        defaultMessage: 'State',
      }),
      width: '120px',
      sortable: true,
      // Synthetic field for sorting — value comes from demo archive + status, not the API row.
      render: (_value: unknown, investigation: InvestigationSummary) => {
        const state = stateLabel(investigationState(investigation));
        return <EuiBadge color={state.color}>{state.label}</EuiBadge>;
      },
    },
    {
      field: 'severity',
      name: i18n.translate('xpack.nightshift.investigationsPage.severityColumn', {
        defaultMessage: 'Severity',
      }),
      width: '100px',
      sortable: true,
      render: (_value: unknown, investigation: InvestigationSummary) => (
        <SeverityBadge severity={investigation.metadata.severity} textSize="s" />
      ),
    },
    {
      field: 'updated_at',
      name: i18n.translate('xpack.nightshift.investigationsPage.updatedColumn', {
        defaultMessage: 'Last updated',
      }),
      width: '140px',
      sortable: true,
      render: (updatedAt: string) => <FormattedRelative value={updatedAt} />,
    },
    {
      name: '',
      width: '100px',
      render: (investigation: InvestigationSummary) => (
        <div onClick={(event) => event.stopPropagation()} role="presentation">
          <InvestigationCardActions investigation={investigation} />
        </div>
      ),
    },
  ];

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      responsive={false}
      css={css`
        margin-top: ${euiTheme.size.s};
        padding-bottom: calc(${euiTheme.size.xxl} * 1.5);
        width: 100%;
        min-width: 0;
      `}
    >
      <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={2}>
          <EuiFieldSearch
            data-test-subj="nightshiftInvestigationsPageSearch"
            placeholder={i18n.translate('xpack.nightshift.investigationsPage.searchPlaceholder', {
              defaultMessage: 'Search',
            })}
            value={draftQuery}
            onChange={(event) => setDraftQuery(event.target.value)}
            onSearch={(value) => replaceUrl({ ...urlState, query: value })}
            isClearable
            fullWidth
            compressed
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFilterGroup compressed>
            <FilterPopover
              label={SEVERITY_FILTER_LABEL}
              options={INVESTIGATIONS_SEVERITY_OPTIONS}
              selected={urlState.severity}
              counts={undefined}
              getLabel={(value) =>
                value === 'none'
                  ? i18n.translate('xpack.nightshift.investigationsPage.severityNone', {
                      defaultMessage: 'None',
                    })
                  : SIGNIFICANT_EVENT_SEVERITY[value].label
              }
              // Same as Observability alerts: colored severity badge, not a text icon.
              getPrepend={(value) =>
                value === 'none' ? (
                  <EuiHealth color={euiTheme.colors.textSubdued} />
                ) : (
                  <EuiBadge color={SIGNIFICANT_EVENT_SEVERITY[value].color} aria-hidden />
                )
              }
              onChange={(severity) => replaceUrl({ ...urlState, severity })}
              testSubject="nightshiftInvestigationsPageSeverity"
            />
            <FilterPopover
              label={STATE_FILTER_LABEL}
              options={INVESTIGATIONS_STATE_OPTIONS}
              selected={urlState.state}
              counts={undefined}
              getLabel={(value) => STATE_FILTER_LABELS[value]}
              getPrepend={(value) => (
                <EuiIcon type="dot" color={STATE_FILTER_ICON_COLOR[value]} aria-hidden={true} />
              )}
              onChange={(state) => replaceUrl({ ...urlState, state })}
              testSubject="nightshiftInvestigationsPageState"
            />
          </EuiFilterGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <NightshiftTimeRangePicker
            start={urlState.rangeFrom}
            end={urlState.rangeTo}
            onChange={({ start, end }) =>
              replaceUrl({ ...urlState, rangeFrom: start, rangeTo: end })
            }
            showRefreshButton
            data-test-subj="nightshiftInvestigationsPageTimePicker"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <InvestigationsHistogram
        investigations={filteredByAttributes}
        rangeFrom={urlState.rangeFrom}
        rangeTo={urlState.rangeTo}
        breakdown={breakdown}
        onBreakdownChange={setBreakdown}
        onTimeRangeChange={({ from, to }) =>
          replaceUrl({ ...urlState, rangeFrom: from, rangeTo: to })
        }
        onSeverityFilter={(severity) => replaceUrl({ ...urlState, severity: [severity] })}
        onStateFilter={(state) => replaceUrl({ ...urlState, state: [state] })}
        stateOf={stateOf}
      />

      <EuiSpacer size="s" />

      <div
        css={css`
          /* Let the table shrink beside the flyout instead of overflowing the page. */
          width: 100%;
          min-width: 0;
          overflow: hidden;
        `}
      >
        <EuiBasicTable
          data-test-subj="nightshiftInvestigationsPageTable"
          items={rows}
          columns={columns}
          tableLayout="fixed"
          sorting={{ sort }}
          onChange={handleTableChange}
          rowProps={(investigation) => ({
            isSelected: investigation.id === selectedInvestigationId,
            'data-test-subj': `nightshiftInvestigationsPageRow-${investigation.id}`,
            onClick: () => openInvestigation(investigation),
          })}
          noItemsMessage={i18n.translate('xpack.nightshift.investigationsPage.empty', {
            defaultMessage: 'No investigations match these filters',
          })}
        />
      </div>
    </EuiFlexGroup>
  );
}
