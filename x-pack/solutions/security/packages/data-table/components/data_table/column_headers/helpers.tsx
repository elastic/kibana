/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { EuiDataGridColumnActions } from '@elastic/eui';
import { keyBy } from 'lodash/fp';
import React from 'react';
import type { FieldSpec } from '@kbn/data-plugin/common';
import { BrowserFields } from '@kbn/timelines-plugin/common';

import { DEFAULT_TABLE_COLUMN_MIN_WIDTH, DEFAULT_TABLE_DATE_COLUMN_MIN_WIDTH } from '../constants';
import { defaultColumnHeaderType } from '../../../store/data_table/defaults';
import { ColumnHeaderOptions } from '../../../common/types';

const defaultActions: EuiDataGridColumnActions = {
  showSortAsc: true,
  showSortDesc: true,
  showHide: false,
};

export const allowSorting = ({
  browserField,
  fieldName,
}: {
  browserField: Partial<FieldSpec> | undefined;
  fieldName: string;
}): boolean => {
  const isAggregatable = browserField?.aggregatable ?? false;

  const isAllowlistedNonBrowserField = [
    'kibana.alert.ancestors.depth',
    'kibana.alert.ancestors.id',
    'kibana.alert.ancestors.rule',
    'kibana.alert.ancestors.type',
    'kibana.alert.original_event.action',
    'kibana.alert.original_event.category',
    'kibana.alert.original_event.code',
    'kibana.alert.original_event.created',
    'kibana.alert.original_event.dataset',
    'kibana.alert.original_event.duration',
    'kibana.alert.original_event.end',
    'kibana.alert.original_event.hash',
    'kibana.alert.original_event.id',
    'kibana.alert.original_event.kind',
    'kibana.alert.original_event.module',
    'kibana.alert.original_event.original',
    'kibana.alert.original_event.outcome',
    'kibana.alert.original_event.provider',
    'kibana.alert.original_event.risk_score',
    'kibana.alert.original_event.risk_score_norm',
    'kibana.alert.original_event.sequence',
    'kibana.alert.original_event.severity',
    'kibana.alert.original_event.start',
    'kibana.alert.original_event.timezone',
    'kibana.alert.original_event.type',
    'kibana.alert.original_time',
    'kibana.alert.reason',
    'kibana.alert.rule.created_by',
    'kibana.alert.rule.description',
    'kibana.alert.rule.enabled',
    'kibana.alert.rule.false_positives',
    'kibana.alert.rule.from',
    'kibana.alert.rule.uuid',
    'kibana.alert.rule.immutable',
    'kibana.alert.rule.interval',
    'kibana.alert.rule.max_signals',
    'kibana.alert.rule.name',
    'kibana.alert.rule.note',
    'kibana.alert.rule.references',
    'kibana.alert.risk_score',
    'kibana.alert.rule.rule_id',
    'kibana.alert.severity',
    'kibana.alert.rule.size',
    'kibana.alert.rule.tags',
    'kibana.alert.rule.threat',
    'kibana.alert.rule.threat.tactic.id',
    'kibana.alert.rule.threat.tactic.name',
    'kibana.alert.rule.threat.tactic.reference',
    'kibana.alert.rule.threat.technique.id',
    'kibana.alert.rule.threat.technique.name',
    'kibana.alert.rule.threat.technique.reference',
    'kibana.alert.rule.timeline_id',
    'kibana.alert.rule.timeline_title',
    'kibana.alert.rule.to',
    'kibana.alert.rule.type',
    'kibana.alert.rule.updated_by',
    'kibana.alert.rule.version',
    'kibana.alert.workflow_status',
  ].includes(fieldName);

  return isAllowlistedNonBrowserField || isAggregatable;
};

const getAllBrowserFields = (browserFields: BrowserFields): Array<Partial<FieldSpec>> =>
  Object.values(browserFields).reduce<Array<Partial<FieldSpec>>>(
    (acc, namespace) => [
      ...acc,
      ...Object.values(namespace.fields != null ? namespace.fields : {}),
    ],
    []
  );

const getAllFieldsByName = (
  browserFields: BrowserFields
): { [fieldName: string]: Partial<FieldSpec> } => keyBy('name', getAllBrowserFields(browserFields));

/**
 * Valid built-in schema types for the `schema` property of `EuiDataGridColumn`
 * are enumerated in the following comment in the EUI repository (permalink):
 * https://github.com/elastic/eui/blob/edc71160223c8d74e1293501f7199fba8fa57c6c/src/components/datagrid/data_grid_types.ts#L417
 */
export type BUILT_IN_SCHEMA = 'boolean' | 'currency' | 'datetime' | 'numeric' | 'json';

/**
 * Returns a valid value for the `EuiDataGridColumn` `schema` property, or
 * `undefined` when the specified `BrowserFields` `type` doesn't match a
 * built-in schema type
 *
 * Notes:
 *
 * - At the time of this writing, the type definition of the
 * `EuiDataGridColumn` `schema` property is:
 *
 * ```ts
 * schema?: string;
 * ```
 * - At the time of this writing, Elasticsearch Field data types are documented here:
 * https://www.elastic.co/guide/en/elasticsearch/reference/7.14/mapping-types.html
 */
export const getSchema = (type: string | undefined): BUILT_IN_SCHEMA | undefined => {
  switch (type) {
    case 'date': // fall through
    case 'date_nanos':
      return 'datetime';
    case 'double': // fall through
    case 'long': // fall through
    case 'number':
      return 'numeric';
    case 'object':
      return 'json';
    case 'boolean':
      return 'boolean';
    default:
      return undefined;
  }
};

const eventRenderedViewColumns: ColumnHeaderOptions[] = [
  {
    columnHeaderType: defaultColumnHeaderType,
    id: '@timestamp',
    displayAsText: i18n.translate(
      'securitySolutionPackages.dataTable.eventRenderedView.timestampTitle.column',
      {
        defaultMessage: 'Timestamp',
      }
    ),
    initialWidth: DEFAULT_TABLE_DATE_COLUMN_MIN_WIDTH + 50,
    actions: false,
    isExpandable: false,
    isResizable: false,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    displayAsText: i18n.translate(
      'securitySolutionPackages.dataTable.eventRenderedView.ruleTitle.column',
      {
        defaultMessage: 'Rule',
      }
    ),
    id: 'kibana.alert.rule.name',
    initialWidth: DEFAULT_TABLE_COLUMN_MIN_WIDTH + 50,
    linkField: 'kibana.alert.rule.uuid',
    actions: false,
    isExpandable: false,
    isResizable: false,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'eventSummary',
    displayAsText: i18n.translate(
      'securitySolutionPackages.dataTable.eventRenderedView.eventSummary.column',
      {
        defaultMessage: 'Event Summary',
      }
    ),
    actions: false,
    isExpandable: false,
    isResizable: false,
  },
];

/** Enriches the column headers with field details from the specified browserFields */
export const getColumnHeaders = (
  headers: ColumnHeaderOptions[],
  browserFields: BrowserFields,
  isEventRenderedView?: boolean
): ColumnHeaderOptions[] => {
  const browserFieldByName = getAllFieldsByName(browserFields);
  const headersToMap = isEventRenderedView ? eventRenderedViewColumns : headers;
  return headersToMap
    ? headersToMap.map((header) => {
        const browserField: Partial<FieldSpec> | undefined = browserFieldByName[header.id];

        // augment the header with metadata from browserFields:
        const augmentedHeader = {
          ...header,
          ...browserField,
          schema: header.schema ?? getSchema(browserField?.type),
        };

        const content = <>{header.display ?? header.displayAsText ?? header.id}</>;

        // return the augmentedHeader with additional properties used by `EuiDataGrid`
        return {
          ...augmentedHeader,
          actions: header.actions ?? defaultActions,
          defaultSortDirection: 'desc', // the default action when a user selects a field via `EuiDataGrid`'s `Pick fields to sort by` UI
          display: <>{content}</>,
          isSortable: allowSorting({
            browserField,
            fieldName: header.id,
          }),
        };
      })
    : [];
};

/**
 * Returns the column header with field details from the defaultHeaders
 */
export const getColumnHeader = (
  fieldName: string,
  defaultHeaders: ColumnHeaderOptions[]
): ColumnHeaderOptions => ({
  columnHeaderType: defaultColumnHeaderType,
  id: fieldName,
  initialWidth: DEFAULT_TABLE_COLUMN_MIN_WIDTH,
  ...(defaultHeaders.find((c) => c.id === fieldName) ?? {}),
});

export const getColumnWidthFromType = (type: string): number =>
  type !== 'date' ? DEFAULT_TABLE_COLUMN_MIN_WIDTH : DEFAULT_TABLE_DATE_COLUMN_MIN_WIDTH;
