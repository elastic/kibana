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
import type { EntityType } from '@kbn/entity-store/public';
import { FF_ENABLE_ENTITY_STORE_V2, useEntityStoreEuidApi } from '@kbn/entity-store/public';
import type { EntityStoreRecord } from '../../../flyout/entity_details/shared/hooks/use_entity_from_store';
import type { ESBoolQuery } from '../../../../common/typed_json';
import type { Status } from '../../../../common/api/detection_engine';
import { SecurityPageName } from '../../../../common/constants';
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
import { resolveEntityIdentifiers } from '../../utils/resolve_entity_identifiers_for_alerts';
import { MultiSelectPopover } from './components';
import * as i18n from './translations';
import type { AlertCountByRuleByStatusItem } from './use_alert_count_by_rule_by_status';
import { useAlertCountByRuleByStatus } from './use_alert_count_by_rule_by_status';
import { useUiSetting } from '../../lib/kibana/kibana_react';
import { useInvestigateInTimeline } from '../../hooks/timeline/use_investigate_in_timeline';

interface EntityFilter {
  field: string;
  value: string;
}
interface AlertCountByStatusProps {
  entityFilter?: EntityFilter;
  /**
   * When set (e.g. host/user details from entity resolution), preferred over legacy `entityFilter.field`.
   * Same semantics as `AlertsByStatus` `identityFields`.
   */
  identityFields?: Record<string, string> | null;
  additionalFilters?: ESBoolQuery[];
  signalIndexName: string | null;
  entityType?: string;
  entityRecord?: EntityStoreRecord | null;
}

interface StatusSelection {
  [fieldName: string]: Status[];
}

const DEFAULT_STATUSES: Status[] = ['open'];

type GetTableColumns = (
  openRuleInTimelineWithAdditionalFields: (ruleName: string) => void
) => Array<EuiBasicTableColumn<AlertCountByRuleByStatusItem>>;

const STATUSES = ['open', 'acknowledged', 'closed'] as const;
const ALERT_COUNT_BY_RULE_BY_STATUS = 'alerts-by-status-by-rule';
const LOCAL_STORAGE_KEY = 'alertCountByFieldNameWidgetSettings';

const StyledEuiPanel = euiStyled(EuiPanel)`
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  max-height: 308px;
`;

export const AlertCountByRuleByStatus = React.memo(
  ({
    additionalFilters,
    signalIndexName,
    identityFields,
    entityFilter,
    entityType,
    entityRecord,
  }: AlertCountByStatusProps) => {
    const entityTypeCacheKey = entityType ?? 'generic';
    const entityStoreV2Enabled = useUiSetting<boolean>(FF_ENABLE_ENTITY_STORE_V2, false);
    const euidApi = useEntityStoreEuidApi();
    const entityIdentifiersResolved = useMemo(
      () => resolveEntityIdentifiers(identityFields, entityFilter),
      [identityFields, entityFilter]
    );

    const euidEntityKqlFilter = useMemo((): string => {
      let kqlFilter: string | null | undefined = '';
      if (!entityStoreV2Enabled || !euidApi?.euid || !entityRecord || !entityType) {
        kqlFilter = entityIdentifiersResolved
          ? Object.entries(entityIdentifiersResolved)
              .map(([field, value]) => `${field}: "${value}"`)
              .join(' AND ')
          : null;
      } else {
        kqlFilter = euidApi.euid.kql.getEuidFilterBasedOnDocument(
          entityType as EntityType,
          entityRecord
        );
      }
      return kqlFilter && kqlFilter.length > 0 ? kqlFilter : '';
    }, [euidApi?.euid, entityType, entityRecord, entityIdentifiersResolved, entityStoreV2Enabled]);

    const queryId = `${ALERT_COUNT_BY_RULE_BY_STATUS}-by-${entityType}`;
    const { toggleStatus, setToggleStatus } = useQueryToggle(queryId);
    const { investigateInTimeline } = useInvestigateInTimeline();

    const [selectedStatusesByField, setSelectedStatusesByField] = useLocalStorage<StatusSelection>({
      defaultValue: {
        [entityTypeCacheKey]: DEFAULT_STATUSES,
      },
      key: LOCAL_STORAGE_KEY,
      isInvalidDefault: (valueFromStorage) => {
        return !valueFromStorage;
      },
    });

    const columns = useMemo(() => {
      return getTableColumns((ruleName: string) => {
        if (!euidEntityKqlFilter || euidEntityKqlFilter.length === 0) {
          return;
        }

        const timelineFilters: string[] = [];

        for (const status of selectedStatusesByField[entityTypeCacheKey] || DEFAULT_STATUSES) {
          timelineFilters.push(
            `${euidEntityKqlFilter} AND ${SIGNAL_RULE_NAME_FIELD_NAME}: "${ruleName}" AND ${SIGNAL_STATUS_FIELD_NAME}: "${status}"`
          );
        }
        investigateInTimeline({
          keepDataView: true,
          query: {
            language: 'kuery',
            query: timelineFilters.map((filter) => `(${filter})`).join(' OR '),
          },
        });
      });
    }, [entityTypeCacheKey, euidEntityKqlFilter, investigateInTimeline, selectedStatusesByField]);

    const updateSelection = useCallback(
      (selection: Status[]) => {
        setSelectedStatusesByField({
          ...selectedStatusesByField,
          [entityTypeCacheKey]: selection,
        });
      },
      [entityTypeCacheKey, selectedStatusesByField, setSelectedStatusesByField]
    );

    const { items, isLoading, updatedAt } = useAlertCountByRuleByStatus({
      additionalFilters,
      identityFields: entityIdentifiersResolved ?? identityFields ?? {},
      entityType,
      entityRecord,
      queryId,
      statuses: (selectedStatusesByField[entityTypeCacheKey] || DEFAULT_STATUSES) as Status[],
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
                selectedItems={selectedStatusesByField[entityTypeCacheKey] || DEFAULT_STATUSES}
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
                  columns={columns}
                  items={items}
                  loading={isLoading}
                  tableCaption={i18n.ALERTS_BY_RULE}
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
