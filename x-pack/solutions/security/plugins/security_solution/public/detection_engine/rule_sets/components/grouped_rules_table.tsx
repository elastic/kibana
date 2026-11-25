/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import type { Criteria, EuiBasicTableColumn, EuiContextMenuPanelDescriptor } from '@elastic/eui';
import {
  EuiAccordion,
  EuiBadge,
  EuiBasicTable,
  EuiButtonEmpty,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiPopover,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { useQuery } from '@kbn/react-query';
import type { RuleResponse } from '../../../../common/api/detection_engine';
import type { GranularRulesFacetCategory } from '../../../../common/api/detection_engine/rule_management';
import {
  convertRulesFilterToKQL,
  FACET_MISSING_VALUE,
} from '../../../../common/detection_engine/rule_management/rule_filtering';
import { useKibana } from '../../../common/lib/kibana';
import { EXCLUDED_GAP_REASONS_KEY } from '../../../../common/constants';
import { useGetGapsSummaryByRuleIds } from '../../rule_gaps/api/hooks/use_get_gaps_summary_by_rule_id';
import { defaultRangeValue } from '../../rule_gaps/constants';
import { fetchSearchRules } from '../../rule_management/api/api';
import type { FilterOptions } from '../../rule_management/logic/types';
import { useRulesTableContext } from '../../rule_management_ui/components/rules_table/rules_table/rules_table_context';
import { useRuleSetEditor } from './rule_set_editor_context';
import {
  GROUP_BY_FIELDS,
  groupByValueLabel,
  normalizeFacetKey,
  toGroupConditions,
  useIntegrationTitles,
} from './group_by_fields';
import { ruleQueryParams } from '../table_query';
import * as i18n from './translations';

const SECTIONS_STEP = 20;
const SECTION_PAGE_SIZE = 10;

type Rule = RuleResponse & { gap_info?: unknown };

/** Table filters of the rules page as KQL, plus the search term, for one section or all. */
const buildSectionQuery = (filterOptions: FilterOptions, browse?: FilterOptions['browse']) => {
  const structuredKql = convertRulesFilterToKQL({ ...filterOptions, filter: '', browse });
  return {
    ...(structuredKql !== '' ? { filter: { term: structuredKql, mode: 'KQL' as const } } : {}),
    ...ruleQueryParams(filterOptions),
  };
};

const SectionStats = ({ counts }: { counts?: Record<string, Record<string, number>> }) => {
  const enabled = counts?.enabled?.['1'] ?? counts?.enabled?.true ?? 0;
  const failed = counts?.lastRunOutcome?.failed ?? 0;
  const warning = counts?.lastRunOutcome?.warning ?? 0;
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          {i18n.SECTION_ENABLED(enabled)}
        </EuiText>
      </EuiFlexItem>
      {failed > 0 && (
        <EuiFlexItem grow={false}>
          <EuiBadge color="danger">{i18n.SECTION_FAILED(failed)}</EuiBadge>
        </EuiFlexItem>
      )}
      {warning > 0 && (
        <EuiFlexItem grow={false}>
          <EuiBadge color="warning">{i18n.SECTION_WARNING(warning)}</EuiBadge>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

/** Rules of one section, with the same columns as the rules table. Loads only when opened. */
const SectionRules = ({
  category,
  value,
  label,
  columns,
}: {
  category: GranularRulesFacetCategory;
  value: string;
  label: string;
  columns: Array<EuiBasicTableColumn<Rule>>;
}) => {
  const {
    state: { filterOptions, sortingOptions, lastUpdated },
  } = useRulesTableContext();
  const { uiSettings } = useKibana().services;
  const [pageIndex, setPageIndex] = useState(0);
  const query = buildSectionQuery(filterOptions, { category, value });

  const { data, isFetching } = useQuery(
    ['ruleSetsSectionRules', query, sortingOptions, pageIndex, lastUpdated],
    ({ signal }) =>
      fetchSearchRules({
        ...query,
        sort_field: sortingOptions.field,
        sort_order: sortingOptions.order,
        pagination: { page: pageIndex + 1, perPage: SECTION_PAGE_SIZE },
        aggregations: { counts: ['enabled', 'lastRunOutcome'] },
        signal,
      }),
    { keepPreviousData: true, refetchOnWindowFocus: false }
  );
  const rules = useMemo(() => data?.data ?? [], [data]);
  const { data: gaps } = useGetGapsSummaryByRuleIds(
    {
      ruleIds: rules.map((rule) => rule.id),
      gapRange: defaultRangeValue,
      excludedReasons: uiSettings.get<string[]>(EXCLUDED_GAP_REASONS_KEY),
    },
    { enabled: rules.length > 0 }
  );
  const items = useMemo(
    () =>
      rules.map((rule) => ({
        ...rule,
        gap_info: gaps?.data?.find((gap) => gap.rule_id === rule.id),
      })),
    [rules, gaps]
  );

  return (
    <>
      <SectionStats counts={data?.counts} />
      <EuiSpacer size="s" />
      <EuiBasicTable<Rule>
        itemId="id"
        items={items}
        tableCaption={label}
        columns={columns}
        loading={isFetching}
        tableLayout="auto"
        scrollableInline
        responsiveBreakpoint={false}
        pagination={{
          pageIndex,
          pageSize: SECTION_PAGE_SIZE,
          totalItemCount: data?.total ?? 0,
          showPerPageOptions: false,
        }}
        onChange={({ page }: Criteria<Rule>) => page && setPageIndex(page.index)}
      />
    </>
  );
};

/** The bulk actions menu of the rules table, for all rules that match `scope`. */
export type GetSectionBulkItems = (
  closePopover: () => void,
  scope: FilterOptions,
  rulesCount: number
) => EuiContextMenuPanelDescriptor[];

const SectionActions = ({
  category,
  value,
  count,
  label,
  getSectionBulkItems,
}: {
  category: GranularRulesFacetCategory;
  value: string;
  count: number;
  label: string;
  getSectionBulkItems: GetSectionBulkItems;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    state: { filterOptions },
    actions: { setFilterOptions },
  } = useRulesTableContext();
  const { openSaveDialog } = useRuleSetEditor();
  const conditions = toGroupConditions(category, value);
  const closePopover = () => setIsOpen(false);

  const getPanels = (): EuiContextMenuPanelDescriptor[] => {
    const [bulkActions, ...bulkActionPanels] = getSectionBulkItems(
      closePopover,
      { ...filterOptions, groupBy: undefined, browse: { category, value } },
      count
    );
    return [
      {
        ...bulkActions,
        title: i18n.SECTION_ACTIONS_TITLE(count),
        items: [
          ...(bulkActions.items ?? []),
          { isSeparator: true, key: 'sectionSeparator' },
          {
            key: 'showInTable',
            name: i18n.SECTION_SHOW_IN_TABLE,
            onClick: () => {
              closePopover();
              setFilterOptions({ groupBy: undefined, browse: { category, value } });
            },
          },
          {
            key: 'newRuleSet',
            name: i18n.SECTION_NEW_GROUP,
            disabled: !conditions,
            toolTipContent: conditions ? undefined : i18n.SECTION_NEW_GROUP_DISABLED,
            toolTipProps: { position: 'right' },
            onClick: () => {
              closePopover();
              if (conditions) {
                openSaveDialog({
                  name: label,
                  rules: { conditions, included_rule_ids: [], excluded_rule_ids: [] },
                  hint: i18n.HINT_FILTERS(count),
                });
              }
            },
          },
        ],
      },
      ...bulkActionPanels,
    ];
  };

  return (
    <EuiPopover
      aria-label={i18n.SECTION_ACTIONS_TITLE(count)}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downRight"
      button={
        <EuiButtonEmpty
          size="xs"
          iconType="chevronSingleDown"
          iconSide="right"
          onClick={() => setIsOpen(!isOpen)}
          data-test-subj="ruleSetsSectionActions"
        >
          {i18n.SECTION_ACTIONS}
        </EuiButtonEmpty>
      }
    >
      {isOpen && <EuiContextMenu initialPanelId={0} panels={getPanels()} />}
    </EuiPopover>
  );
};

/** The rules table split into collapsible sections by one field ("Group by"). */
export const GroupedRulesTable = ({
  columns,
  getSectionBulkItems,
}: {
  columns: Array<EuiBasicTableColumn<Rule>>;
  getSectionBulkItems: GetSectionBulkItems;
}) => {
  const {
    state: { filterOptions, lastUpdated },
  } = useRulesTableContext();
  const [visible, setVisible] = useState(SECTIONS_STEP);
  // Sections load their rules only when open. The first section starts open.
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [firstOpened, setFirstOpened] = useState(false);
  const category = filterOptions.groupBy as GranularRulesFacetCategory;
  const query = buildSectionQuery(filterOptions);
  const field = GROUP_BY_FIELDS.find((option) => option.value === category);
  const integrationTitles = useIntegrationTitles();
  // The snooze column loads settings per row outside the main table; skip it in sections.
  const sectionColumns = useMemo(
    () => columns.filter((column) => !('field' in column) || column.field !== 'snooze'),
    [columns]
  );

  const { data, isLoading } = useQuery(
    ['ruleSetsSections', category, query, lastUpdated],
    async ({ signal }) => {
      const response = await fetchSearchRules({
        ...query,
        fields: ['id'],
        pagination: { page: 1, perPage: 1 },
        aggregations: { counts: [category] },
        signal,
      });
      const sections = Object.entries(response.counts?.[category] ?? {})
        .map(([key, count]): [string, number] => [normalizeFacetKey(category, key), count])
        .sort((x, y) => y[1] - x[1]);
      // For a one-value field, the rules without the field are the rest. For tags or tactics a
      // rule can be in several sections, so the rest cannot be counted this way.
      const withValue = sections.reduce((sum, [, count]) => sum + count, 0);
      if (!field?.multiValue && response.total > withValue) {
        sections.push([FACET_MISSING_VALUE, response.total - withValue]);
      }
      return { total: response.total, sections };
    },
    { keepPreviousData: true, refetchOnWindowFocus: false }
  );

  if (isLoading) {
    return <EuiSkeletonText lines={6} />;
  }
  const sections = data?.sections ?? [];
  if (!firstOpened && sections.length) {
    setFirstOpened(true);
    setOpenSections(new Set([sections[0][0]]));
  }

  return (
    <div data-test-subj="ruleSetsGroupedTable">
      <EuiText size="xs" color="subdued">
        {i18n.SECTIONS_SUMMARY(data?.total ?? 0, sections.length, field?.text ?? category)}
        {field?.multiValue ? ` ${i18n.SECTIONS_MULTI_VALUE_NOTE}` : ''}
      </EuiText>
      <EuiSpacer size="s" />
      {sections.slice(0, visible).map(([value, count]) => (
        <React.Fragment key={value}>
          <EuiPanel hasBorder paddingSize="none" hasShadow={false}>
            <EuiAccordion
              id={`ruleSetsSection-${category}-${value}`}
              paddingSize="none"
              // Controlled, so a closed section renders (and loads) nothing.
              forceState={openSections.has(value) ? 'open' : 'closed'}
              onToggle={(isOpen) =>
                setOpenSections((current) => {
                  const next = new Set(current);
                  if (isOpen) next.add(value);
                  else next.delete(value);
                  return next;
                })
              }
              buttonProps={{ css: { padding: '12px 8px' } }}
              buttonContent={
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s">
                      <strong>{groupByValueLabel(category, value, integrationTitles)}</strong>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="hollow">{count}</EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
              extraAction={
                <SectionActions
                  category={category}
                  value={value}
                  count={count}
                  label={groupByValueLabel(category, value, integrationTitles)}
                  getSectionBulkItems={getSectionBulkItems}
                />
              }
              data-test-subj="ruleSetsSection"
            >
              <div css={{ padding: '0 12px 12px' }}>
                {openSections.has(value) && (
                  <SectionRules
                    category={category}
                    value={value}
                    label={groupByValueLabel(category, value, integrationTitles)}
                    columns={sectionColumns}
                  />
                )}
              </div>
            </EuiAccordion>
          </EuiPanel>
          <EuiSpacer size="s" />
        </React.Fragment>
      ))}
      {sections.length > visible && (
        <EuiButtonEmpty size="s" onClick={() => setVisible(visible + SECTIONS_STEP)}>
          {i18n.SECTIONS_SHOW_MORE(sections.length - visible)}
        </EuiButtonEmpty>
      )}
    </div>
  );
};
