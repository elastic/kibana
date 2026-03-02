/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  tableDefaults,
  TableId,
  type SubsetDataTableModel,
} from '@kbn/securitysolution-data-table';
import { defaultEventHeaders, hostEventsDefaultHeaders } from './default_event_headers';

export const eventsDefaultModel: SubsetDataTableModel = {
  ...tableDefaults,
  columns: defaultEventHeaders,
};

/**
 * Returns the default model (including columns) for the given table id.
 * Hosts Events table uses columns that include all Host entity identifier fields.
 */
export const getEventsDefaultModelForTable = (
  tableId: TableId
): SubsetDataTableModel => {
  const columns =
    tableId === TableId.hostsPageEvents ? hostEventsDefaultHeaders : defaultEventHeaders;
  return {
    ...tableDefaults,
    columns,
  };
};
