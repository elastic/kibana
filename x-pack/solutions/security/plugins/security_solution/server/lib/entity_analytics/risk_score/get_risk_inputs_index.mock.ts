/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewAttributes, SavedObject } from '@kbn/data-views-plugin/common';

export const buildDataViewResponseMock = (): SavedObject<DataViewAttributes> => ({
  id: 'security-solution-default',
  type: 'index-pattern',
  namespaces: ['default'],
  updated_at: '2023-06-07T18:57:09.766Z',
  created_at: '2023-06-07T18:57:09.766Z',
  version: 'WzUsMV0=',
  attributes: {
    fieldAttrs: '{}',
    title:
      '.alerts-security.alerts-default,apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,traces-apm*,winlogbeat-*,-*elastic-cloud-logs-*',
    timeFieldName: '@timestamp',
    sourceFilters: '[]',
    fields: '[]',
    fieldFormatMap: '{}',
    typeMeta: '{}',
    allowNoIndex: true,
    runtimeFieldMap: '{"custom":{"type":"keyword","script":{"source":"emit(\'hi mom\')"}}}',
    name: '.alerts-security.alerts-default,apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,traces-apm*,winlogbeat-*,-*elastic-cloud-logs-*',
  },
  references: [],
  managed: false,
  coreMigrationVersion: '8.8.0',
  typeMigrationVersion: '8.0.0',
});
