/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';

import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiBasicTable, EuiEmptyPrompt, EuiLink, EuiPanel, EuiToolTip } from '@elastic/eui';
import { euiStyled } from '@kbn/kibana-react-plugin/common';

import type { ESBoolQuery } from '../../../../common/typed_json';
import type { Status } from '../../../../common/api/detection_engine';
import { SecurityPageName } from '../../../../common/constants';
import type { Filter } from '../../../overview/components/detection_response/hooks/use_navigate_to_timeline';
import { useNavigateToTimeline } from '../../../overview/components/detection_response/hooks/use_navigate_to_timeline';
import {
  SIGNAL_RULE_NAME_FIELD_NAME,
  SIGNAL_STATUS_FIELD_NAME,
} from '../../../timelines/components/timeline/body/renderers/constants';
import { useQueryToggle } from '../../containers/query_toggle';
import { FormattedCount } from '../formatted_number';
import { HeaderSection } from '../header_section';
import { HoverVisibilityContainer } from '../hover_visibility_container';
import { BUTTON_CLASS as INSPECT_BUTTON_CLASS } from '../inspect';
import { LastUpdatedAt } from '../last_updated_at';
import { SecuritySolutionLinkAnchor } from '../links';
import { useLocalStorage } from '../local_storage';
import { buildEntityFiltersFromEntityIdentifiers } from '../../../../common/search_strategy/security_solution/risk_score/common';
import type { EntityIdentifiers } from '../../../flyout/document_details/shared/utils';
import { MultiSelectPopover } from './components';
import * as i18n from './translations';
import type { AlertCountByRuleByStatusItem } from './use_alert_count_by_rule_by_status';
import { useAlertCountByRuleByStatus } from './use_alert_count_by_rule_by_status';

interface AlertCountByStatusProps {
  entityIdentifiers: EntityIdentifiers;
  additionalFilters?: ESBoolQuery[];
  signalIndexName: string | null;
}

interface StatusSelection {
  [fieldName: string]: Status[];
}

type GetTableColumns = (
  openRuleInTimelineWithAdditionalFields: (ruleName: string) => void
) => Array<EuiBasicTableColumn<AlertCountByRuleByStatusItem>>;

const STATUSES = ['open', 'acknowledged', 'closed'] as const;
const ALERT_COUNT_BY_RULE_BY_STATUS = 'alerts-by-status-by-rule';
const LOCAL_STORAGE_KEY = 'alertCountByFieldNameWidgetSettings';

/**
 * Builds Filter[] from entityIdentifiers for timeline navigation following entity store EUID priority logic.
 * Priority order for hosts: host.entity.id > host.id > (host.name/hostname + host.domain) > (host.name/hostname + host.mac) > host.name > host.hostname
 * Priority order for users: user.entity.id > user.id > user.email > user.name (with related fields)
 */
const buildTimelineFiltersFromEntityIdentifiers = (
  entityIdentifiers: EntityIdentifiers
): Filter[] => {
  const esFilters = buildEntityFiltersFromEntityIdentifiers(entityIdentifiers);
  // Convert ES query filters to timeline Filter format
  return esFilters
    .filter(
      (filter): filter is { term: Record<string, string> } =>
        'term' in filter && filter.term !== undefined
    )
    .flatMap((filter) => {
      return Object.entries(filter.term).map(([field, value]) => ({
        field,
        value: String(value),
      }));
    });
};

/**
 * Gets a unique key from entityIdentifiers for use in localStorage and queryId.
 * Uses the highest priority field available.
 */
const getEntityKey = (entityIdentifiers: EntityIdentifiers): string => {
  if (entityIdentifiers['host.entity.id']) return 'host.entity.id';
  if (entityIdentifiers['host.id']) return 'host.id';
  if (entityIdentifiers['host.name']) return 'host.name';
  if (entityIdentifiers['host.hostname']) return 'host.hostname';
  if (entityIdentifiers['user.entity.id']) return 'user.entity.id';
  if (entityIdentifiers['user.id']) return 'user.id';
  if (entityIdentifiers['user.email']) return 'user.email';
  if (entityIdentifiers['user.name']) return 'user.name';
  if (entityIdentifiers['source.ip']) return 'source.ip';
  if (entityIdentifiers['destination.ip']) return 'destination.ip';
  // Fallback: use the first key
  const keys = Object.keys(entityIdentifiers);
  return keys.length > 0 ? keys[0] : 'unknown';
};

const StyledEuiPanel = euiStyled(EuiPanel)`
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  max-height: 308px;
`;

export const AlertCountByRuleByStatus = React.memo(
  ({ entityIdentifiers, signalIndexName, additionalFilters }: AlertCountByStatusProps) => {
    const entityKey = getEntityKey(entityIdentifiers);
    const queryId = `${ALERT_COUNT_BY_RULE_BY_STATUS}-by-${entityKey}`;
    const { toggleStatus, setToggleStatus } = useQueryToggle(queryId);

    const { openTimelineWithFilters } = useNavigateToTimeline();

    const [selectedStatusesByField, setSelectedStatusesByField] = useLocalStorage<StatusSelection>({
      defaultValue: {
        [entityKey]: ['open'],
      },
      key: LOCAL_STORAGE_KEY,
      isInvalidDefault: (valueFromStorage) => {
        return !valueFromStorage;
      },
    });

    const entityTimelineFilters = useMemo(
      () => buildTimelineFiltersFromEntityIdentifiers(entityIdentifiers),
      [entityIdentifiers]
    );

    const columns = useMemo(() => {
      return getTableColumns((ruleName: string) => {
        const timelineFilters: Filter[][] = [];

        for (const status of selectedStatusesByField[entityKey] || ['open']) {
          timelineFilters.push([
            ...entityTimelineFilters,
            { field: SIGNAL_RULE_NAME_FIELD_NAME, value: ruleName },
            {
              field: SIGNAL_STATUS_FIELD_NAME,
              value: status,
            },
          ]);
        }
        openTimelineWithFilters(timelineFilters);
      });
    }, [entityTimelineFilters, entityKey, openTimelineWithFilters, selectedStatusesByField]);

    const updateSelection = useCallback(
      (selection: Status[]) => {
        setSelectedStatusesByField({
          ...selectedStatusesByField,
          [entityKey]: selection,
        });
      },
      [entityKey, selectedStatusesByField, setSelectedStatusesByField]
    );

    const { items, isLoading, updatedAt } = useAlertCountByRuleByStatus({
      additionalFilters,
      entityIdentifiers,
      queryId,
      statuses: (selectedStatusesByField[entityKey] || ['open']) as Status[],
      skip: !toggleStatus,
      signalIndexName,
    });

    return (
      <HoverVisibilityContainer show={true} targetClassNames={[INSPECT_BUTTON_CLASS]}>
        <StyledEuiPanel hasBorder data-test-subj="alertCountByRulePanel">
          <>
            <HeaderSection
              id={queryId}
              title={i18n.ALERTS_BY_RULE}
              titleSize="m"
              toggleStatus={toggleStatus}
              toggleQuery={setToggleStatus}
              subtitle={<LastUpdatedAt updatedAt={updatedAt} isUpdating={isLoading} />}
            >
              <MultiSelectPopover
                title={i18n.Status}
                allItems={STATUSES}
                selectedItems={selectedStatusesByField[entityKey] || ['open']}
                onSelectedItemsChange={(selectedItems) =>
                  updateSelection(selectedItems as Status[])
                }
              />
            </HeaderSection>

            {toggleStatus && (
              <>
                <EuiBasicTable
                  className="eui-yScroll"
                  data-test-subj="alertCountByRuleTable"
                  tableCaption={i18n.ALERTS_BY_RULE}
                  columns={columns}
                  items={items}
                  loading={isLoading}
                  noItemsMessage={
                    <EuiEmptyPrompt title={<h3>{i18n.NO_ALERTS_FOUND}</h3>} titleSize="xs" />
                  }
                />
              </>
            )}
          </>
        </StyledEuiPanel>
      </HoverVisibilityContainer>
    );
  }
);

AlertCountByRuleByStatus.displayName = 'AlertCountByStatus';

export const getTableColumns: GetTableColumns = (openRuleInTimelineWithAdditionalFields) => [
  {
    field: 'ruleName',
    name: i18n.COLUMN_HEADER_RULE_NAME,
    'data-test-subj': i18n.COLUMN_HEADER_RULE_NAME,
    align: 'left',
    width: '67%',
    sortable: false,
    render: (ruleName: string, { uuid }) => (
      <EuiToolTip
        data-test-subj={`${ruleName}-tooltip`}
        title={i18n.TOOLTIP_TITLE}
        content={ruleName}
        anchorClassName="eui-textTruncate"
      >
        <SecuritySolutionLinkAnchor
          data-test-subj="severityRuleAlertsTable-name"
          deepLinkId={SecurityPageName.rules}
          path={`id/${uuid}`}
        >
          {ruleName}
        </SecuritySolutionLinkAnchor>
      </EuiToolTip>
    ),
  },
  {
    field: 'count',
    name: i18n.COLUMN_HEADER_COUNT,
    width: '33%',
    'data-test-subj': i18n.COLUMN_HEADER_COUNT,
    sortable: true,
    align: 'right',
    render: (count: number, { ruleName }) => (
      <EuiLink
        disabled={count === 0}
        onClick={async () => {
          await openRuleInTimelineWithAdditionalFields(ruleName);
        }}
      >
        <FormattedCount count={count} />
      </EuiLink>
    ),
  },
];
