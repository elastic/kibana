/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { getOr, sortBy } from 'lodash/fp';
import memoizeOne from 'memoize-one';
import { css } from '@emotion/react';
import { type EuiBasicTableColumn, EuiText, EuiInMemoryTable, useEuiFontSize } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { dataTableSelectors, tableDefaults } from '@kbn/securitysolution-data-table';
import type { BrowserFields, TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { FieldSpec } from '@kbn/data-plugin/common';
import { getCategory } from '@kbn/response-ops-alerts-fields-browser/helpers';
import { TableFieldNameCell } from '../components/table_field_name_cell';
import { TableFieldValueCell } from '../components/table_field_value_cell';
import { TABLE_TAB_CONTENT_TEST_ID, TABLE_TAB_SEARCH_INPUT_TEST_ID } from './test_ids';
import { getAllFieldsByName } from '../../../../common/containers/source';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { timelineDefaults } from '../../../../timelines/store/defaults';
import { timelineSelectors } from '../../../../timelines/store';
import type { EventFieldsData } from '../../../../common/components/event_details/types';
import { CellActions } from '../../shared/components/cell_actions';
import { useDocumentDetailsContext } from '../../shared/context';
import { isInTableScope, isTimelineScope } from '../../../../helpers';
import { useBasicDataFromDetailsData } from '../../shared/hooks/use_basic_data_from_details_data';

const COUNT_PER_PAGE_OPTIONS = [25, 50, 100];

const PLACEHOLDER = i18n.translate('xpack.securitySolution.flyout.table.filterPlaceholderLabel', {
  defaultMessage: 'Filter by field or value...',
});
export const FIELD = i18n.translate('xpack.securitySolution.flyout.table.fieldCellLabel', {
  defaultMessage: 'Field',
});
const VALUE = i18n.translate('xpack.securitySolution.flyout.table.valueCellLabel', {
  defaultMessage: 'Value',
});

/**
 * Defines the behavior of the search input that appears above the table of data
 */
const search = {
  box: {
    incremental: true,
    placeholder: PLACEHOLDER,
    schema: true,
    'data-test-subj': TABLE_TAB_SEARCH_INPUT_TEST_ID,
  },
};

/**
 * Retrieve the correct field from the BrowserField
 */
export const getFieldFromBrowserField = memoizeOne(
  (field: string, browserFields: BrowserFields): FieldSpec | undefined => {
    const category = getCategory(field);

    return browserFields[category]?.fields?.[field] as FieldSpec;
  },
  (newArgs, lastArgs) => newArgs[0] === lastArgs[0]
);

export type ColumnsProvider = (providerOptions: {
  /**
   * An object containing fields by type
   */
  browserFields: BrowserFields;
  /**
   * Id of the document
   */
  eventId: string;
  /**
   * Maintain backwards compatibility // TODO remove when possible
   */
  scopeId: string;
  /**
   * Id of the rule
   */
  ruleId: string;
  /**
   * Whether the preview link is in preview mode
   */
  isPreview: boolean;
  /**
   * Value of the link field if it exists. Allows to navigate to other pages like host, user, network...
   */
  getLinkValue: (field: string) => string | null;
}) => Array<EuiBasicTableColumn<TimelineEventsDetailsItem>>;

export const getColumns: ColumnsProvider = ({
  browserFields,
  eventId,
  scopeId,
  getLinkValue,
  ruleId,
  isPreview,
}) => [
  {
    field: 'field',
    name: (
      <EuiText size="xs">
        <strong>{FIELD}</strong>
      </EuiText>
    ),
    width: '30%',
    render: (field, data) => {
      return <TableFieldNameCell dataType={(data as EventFieldsData).type} field={field} />;
    },
  },
  {
    field: 'values',
    name: (
      <EuiText size="xs">
        <strong>{VALUE}</strong>
      </EuiText>
    ),
    width: '70%',
    render: (values, data) => {
      const fieldFromBrowserField = getFieldFromBrowserField(data.field, browserFields);
      return (
        <CellActions field={data.field} value={values} isObjectArray={data.isObjectArray}>
          <TableFieldValueCell
            scopeId={scopeId}
            data={data as EventFieldsData}
            eventId={eventId}
            fieldFromBrowserField={fieldFromBrowserField}
            getLinkValue={getLinkValue}
            ruleId={ruleId}
            isPreview={isPreview}
            values={values}
          />
        </CellActions>
      );
    },
  },
];

/**
 * Table view displayed in the document details expandable flyout right section Table tab
 */
export const TableTab = memo(() => {
  const smallFontSize = useEuiFontSize('xs').fontSize;

  const { browserFields, dataFormattedForFieldBrowser, eventId, scopeId, isPreview } =
    useDocumentDetailsContext();
  const { ruleId } = useBasicDataFromDetailsData(dataFormattedForFieldBrowser);

  const [pagination, setPagination] = useState<{ pageIndex: number }>({
    pageIndex: 0,
  });
  const onTableChange = useCallback(({ page: { index } }: { page: { index: number } }) => {
    setPagination({ pageIndex: index });
  }, []);

  const getScope = useMemo(() => {
    if (isTimelineScope(scopeId)) {
      return timelineSelectors.getTimelineByIdSelector();
    } else if (isInTableScope(scopeId)) {
      return dataTableSelectors.getTableByIdSelector();
    }
  }, [scopeId]);

  const defaults = useMemo(
    () => (isTimelineScope(scopeId) ? timelineDefaults : tableDefaults),
    [scopeId]
  );

  const columnHeaders = useDeepEqualSelector((state) => {
    const { columns } = (getScope && getScope(state, scopeId)) ?? defaults;
    return columns;
  });

  const fieldsByName = useMemo(() => getAllFieldsByName(browserFields), [browserFields]);

  const items = useMemo(
    () =>
      sortBy(['field'], dataFormattedForFieldBrowser).map((item, i) => ({
        ...item,
        ...fieldsByName[item.field],
        valuesConcatenated: item.values != null ? item.values.join() : '',
        ariaRowindex: i + 1,
      })),
    [dataFormattedForFieldBrowser, fieldsByName]
  );

  const getLinkValue = useCallback(
    (field: string) => {
      const columnHeader = columnHeaders.find((col) => col.id === field);
      if (!columnHeader || !columnHeader.linkField) {
        return null;
      }
      const linkFieldData = (dataFormattedForFieldBrowser ?? []).find(
        (d) => d.field === columnHeader.linkField
      );
      const linkFieldValue = getOr(null, 'originalValue', linkFieldData);
      return Array.isArray(linkFieldValue) ? linkFieldValue[0] : linkFieldValue;
    },
    [dataFormattedForFieldBrowser, columnHeaders]
  );

  // forces the rows of the table to render smaller fonts
  const onSetRowProps = useCallback(
    ({ field }: TimelineEventsDetailsItem) => ({
      className: 'flyout-table-row-small-font',
      'data-test-subj': `flyout-table-row-${field}`,
    }),
    []
  );

  const columns = useMemo(
    () =>
      getColumns({
        browserFields,
        eventId,
        scopeId,
        getLinkValue,
        ruleId,
        isPreview,
      }),
    [browserFields, eventId, scopeId, getLinkValue, ruleId, isPreview]
  );

  return (
    <EuiInMemoryTable
      items={items}
      itemId="field"
      columns={columns}
      onTableChange={onTableChange}
      pagination={{
        ...pagination,
        pageSizeOptions: COUNT_PER_PAGE_OPTIONS,
      }}
      rowProps={onSetRowProps}
      search={search}
      sorting={false}
      data-test-subj={TABLE_TAB_CONTENT_TEST_ID}
      css={css`
        .euiTableRow {
          font-size: ${smallFontSize};
        }
      `}
    />
  );
});

TableTab.displayName = 'TableTab';
