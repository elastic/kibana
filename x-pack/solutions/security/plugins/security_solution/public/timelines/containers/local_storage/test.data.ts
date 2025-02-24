/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const v88xAlertOrignalData = {
  'detection-engine-alert-table-securitySolution-rule-details-gridView': {
    columns: [
      {
        initialWidth: 200,
        columnHeaderType: 'not-filtered',
        id: '@timestamp',
        schema: 'datetime',
      },
      {
        id: '_id',
        schema: 'string',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        displayAsText: 'Rule',
        id: 'kibana.alert.rule.name',
        linkField: 'kibana.alert.rule.uuid',
        schema: 'string',
      },
      {
        initialWidth: 105,
        columnHeaderType: 'not-filtered',
        displayAsText: 'Severity',
        id: 'kibana.alert.severity',
        schema: 'string',
      },
      {
        initialWidth: 100,
        columnHeaderType: 'not-filtered',
        displayAsText: 'Risk Score',
        id: 'kibana.alert.risk_score',
        schema: 'numeric',
      },
      {
        initialWidth: 450,
        columnHeaderType: 'not-filtered',
        displayAsText: 'Reason',
        id: 'kibana.alert.reason',
        schema: 'string',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'host.name',
        schema: 'string',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'host.risk.calculated_level',
        schema: 'string',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'user.name',
        schema: 'string',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'user.risk.calculated_level',
        schema: 'string',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'process.name',
        schema: 'string',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'file.name',
        schema: 'string',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'source.ip',
        schema: 'ip',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'destination.ip',
        schema: 'ip',
      },
    ],
    sort: [
      {
        '@timestamp': {
          order: 'desc',
        },
      },
    ],
    visibleColumns: [
      {
        initialWidth: 200,
        columnHeaderType: 'not-filtered',
        id: '@timestamp',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        displayAsText: 'Rule',
        id: 'kibana.alert.rule.name',
        linkField: 'kibana.alert.rule.uuid',
      },
      {
        initialWidth: 105,
        columnHeaderType: 'not-filtered',
        displayAsText: 'Severity',
        id: 'kibana.alert.severity',
      },
      {
        initialWidth: 100,
        columnHeaderType: 'not-filtered',
        displayAsText: 'Risk Score',
        id: 'kibana.alert.risk_score',
      },
      {
        initialWidth: 450,
        columnHeaderType: 'not-filtered',
        displayAsText: 'Reason',
        id: 'kibana.alert.reason',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'host.name',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'host.risk.calculated_level',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'user.name',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'user.risk.calculated_level',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'process.name',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'file.name',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'source.ip',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'destination.ip',
      },
    ],
  },
  'detection-engine-alert-table-securitySolution-alerts-page-gridView': {
    columns: [
      {
        initialWidth: 200,
        columnHeaderType: 'not-filtered',
        id: '@timestamp',
        schema: 'datetime',
      },
      {
        id: '_id',
        schema: 'string',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        displayAsText: 'Rule',
        id: 'kibana.alert.rule.name',
        linkField: 'kibana.alert.rule.uuid',
        schema: 'string',
      },
      {
        initialWidth: 105,
        columnHeaderType: 'not-filtered',
        displayAsText: 'Severity',
        id: 'kibana.alert.severity',
        schema: 'string',
      },
      {
        initialWidth: 100,
        columnHeaderType: 'not-filtered',
        displayAsText: 'Risk Score',
        id: 'kibana.alert.risk_score',
        schema: 'numeric',
      },
      {
        initialWidth: 450,
        columnHeaderType: 'not-filtered',
        displayAsText: 'Reason',
        id: 'kibana.alert.reason',
        schema: 'string',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'host.name',
        schema: 'string',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'host.risk.calculated_level',
        schema: 'string',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'user.name',
        schema: 'string',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'user.risk.calculated_level',
        schema: 'string',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'process.name',
        schema: 'string',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'file.name',
        schema: 'string',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'source.ip',
        schema: 'ip',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'destination.ip',
        schema: 'ip',
      },
    ],
    sort: [
      {
        '@timestamp': {
          order: 'desc',
        },
      },
    ],
    visibleColumns: [
      {
        initialWidth: 200,
        columnHeaderType: 'not-filtered',
        id: '@timestamp',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        displayAsText: 'Rule',
        id: 'kibana.alert.rule.name',
        linkField: 'kibana.alert.rule.uuid',
      },
      {
        initialWidth: 105,
        columnHeaderType: 'not-filtered',
        displayAsText: 'Severity',
        id: 'kibana.alert.severity',
      },
      {
        initialWidth: 100,
        columnHeaderType: 'not-filtered',
        displayAsText: 'Risk Score',
        id: 'kibana.alert.risk_score',
      },
      {
        initialWidth: 450,
        columnHeaderType: 'not-filtered',
        displayAsText: 'Reason',
        id: 'kibana.alert.reason',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'host.name',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'host.risk.calculated_level',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'user.name',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'user.risk.calculated_level',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'process.name',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'file.name',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'source.ip',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'destination.ip',
      },
    ],
  },
};

// when upgrading from 8.9.x => 8.9.y
export const v89xAlertsOriginalData = {
  'detection-engine-alert-table-securitySolution-rule-details-gridView': {
    columns: [
      {
        initialWidth: 200,
        columnHeaderType: 'not-filtered',
        id: '@timestamp',
        schema: 'datetime',
      },
      {
        id: '_id',
        schema: 'string',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        displayAsText: 'Rule',
        id: 'kibana.alert.rule.name',
        linkField: 'kibana.alert.rule.uuid',
        schema: 'string',
      },
      {
        initialWidth: 105,
        columnHeaderType: 'not-filtered',
        displayAsText: 'Severity',
        id: 'kibana.alert.severity',
        schema: 'string',
      },
      {
        initialWidth: 100,
        columnHeaderType: 'not-filtered',
        displayAsText: 'Risk Score',
        id: 'kibana.alert.risk_score',
        schema: 'numeric',
      },
      {
        initialWidth: 450,
        columnHeaderType: 'not-filtered',
        displayAsText: 'Reason',
        id: 'kibana.alert.reason',
        schema: 'string',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'host.name',
        schema: 'string',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'host.risk.calculated_level',
        schema: 'string',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'user.name',
        schema: 'string',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'user.risk.calculated_level',
        schema: 'string',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'process.name',
        schema: 'string',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'file.name',
        schema: 'string',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'source.ip',
        schema: 'ip',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'destination.ip',
        schema: 'ip',
      },
    ],
    sort: [
      {
        '@timestamp': {
          order: 'desc',
        },
      },
    ],
    visibleColumns: [
      '@timestamp',
      'kibana.alert.rule.name',
      'kibana.alert.severity',
      'kibana.alert.risk_score',
      'kibana.alert.reason',
      'host.name',
      'host.risk.calculated_level',
      'user.name',
      'user.risk.calculated_level',
      'process.name',
      'file.name',
      'source.ip',
      'destination.ip',
    ],
  },
  'detection-engine-alert-table-securitySolution-alerts-page-gridView': {
    columns: [
      {
        initialWidth: 200,
        columnHeaderType: 'not-filtered',
        id: '@timestamp',
        schema: 'datetime',
      },
      {
        id: '_id',
        schema: 'string',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        displayAsText: 'Rule',
        id: 'kibana.alert.rule.name',
        linkField: 'kibana.alert.rule.uuid',
        schema: 'string',
      },
      {
        initialWidth: 105,
        columnHeaderType: 'not-filtered',
        displayAsText: 'Severity',
        id: 'kibana.alert.severity',
        schema: 'string',
      },
      {
        initialWidth: 100,
        columnHeaderType: 'not-filtered',
        displayAsText: 'Risk Score',
        id: 'kibana.alert.risk_score',
        schema: 'numeric',
      },
      {
        initialWidth: 450,
        columnHeaderType: 'not-filtered',
        displayAsText: 'Reason',
        id: 'kibana.alert.reason',
        schema: 'string',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'host.name',
        schema: 'string',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'host.risk.calculated_level',
        schema: 'string',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'user.name',
        schema: 'string',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'user.risk.calculated_level',
        schema: 'string',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'process.name',
        schema: 'string',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'file.name',
        schema: 'string',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'source.ip',
        schema: 'ip',
      },
      {
        initialWidth: 180,
        columnHeaderType: 'not-filtered',
        id: 'destination.ip',
        schema: 'ip',
      },
    ],
    sort: [
      {
        '@timestamp': {
          order: 'desc',
        },
      },
    ],
    visibleColumns: [
      '@timestamp',
      'kibana.alert.rule.name',
      'kibana.alert.severity',
      'kibana.alert.risk_score',
      'kibana.alert.reason',
      'host.name',
      'host.risk.calculated_level',
      'user.name',
      'user.risk.calculated_level',
      'process.name',
      'file.name',
      'source.ip',
      'destination.ip',
    ],
  },
};
