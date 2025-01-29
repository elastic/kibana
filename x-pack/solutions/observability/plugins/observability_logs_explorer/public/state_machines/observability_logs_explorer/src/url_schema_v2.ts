/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogsExplorerPublicStateUpdate } from '@kbn/logs-explorer-plugin/public';
import * as rt from 'io-ts';
import { deepCompactObject, logsExplorerUrlSchemaV2 } from '../../../../common';

export const getStateFromUrlValue = (
  urlValue: logsExplorerUrlSchemaV2.UrlSchema
): LogsExplorerPublicStateUpdate =>
  deepCompactObject<LogsExplorerPublicStateUpdate>({
    chart: {
      breakdownField: urlValue.breakdownField,
    },
    controls: urlValue.controls,
    dataSourceSelection: urlValue.dataSourceSelection,
    filters: urlValue.filters,
    grid: {
      columns: urlValue.columns,
      rows: {
        rowHeight: urlValue.rowHeight,
        rowsPerPage: urlValue.rowsPerPage,
      },
    },
    query: urlValue.query,
    refreshInterval: urlValue.refreshInterval,
    time: urlValue.time,
  });

export const getUrlValueFromState = (
  state: LogsExplorerPublicStateUpdate
): logsExplorerUrlSchemaV2.UrlSchema =>
  deepCompactObject<logsExplorerUrlSchemaV2.UrlSchema>({
    breakdownField: state.chart?.breakdownField,
    columns: state.grid?.columns,
    controls: state.controls,
    dataSourceSelection: state.dataSourceSelection,
    filters: state.filters,
    query: state.query,
    refreshInterval: state.refreshInterval,
    rowHeight: state.grid?.rows?.rowHeight,
    rowsPerPage: state.grid?.rows?.rowsPerPage,
    time: state.time,
    v: 2,
  });

const stateFromUrlSchemaRT = new rt.Type<
  LogsExplorerPublicStateUpdate,
  logsExplorerUrlSchemaV2.UrlSchema,
  logsExplorerUrlSchemaV2.UrlSchema
>(
  'stateFromUrlSchemaRT',
  rt.never.is,
  (urlSchema, context) => rt.success(getStateFromUrlValue(urlSchema)),
  getUrlValueFromState
);

export const stateFromUntrustedUrlRT =
  logsExplorerUrlSchemaV2.urlSchemaRT.pipe(stateFromUrlSchemaRT);
