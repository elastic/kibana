/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { persistReportFields } from './persist_report_fields';

describe('persistReportFields', () => {
  it('merges the given doc onto the report at the given index/id', async () => {
    const esClient = { update: jest.fn().mockResolvedValue({}) };

    await persistReportFields(esClient as never, {
      index: '.kibana-threat-reports-000001',
      id: 'report-1',
      doc: { extracted: { gate: { is_intelligence: false } } },
    });

    expect(esClient.update).toHaveBeenCalledWith({
      index: '.kibana-threat-reports-000001',
      id: 'report-1',
      doc: { extracted: { gate: { is_intelligence: false } } },
    });
  });

  it('does not upsert -- a missing doc must fail rather than materialize a partial row', async () => {
    const esClient = { update: jest.fn().mockResolvedValue({}) };

    await persistReportFields(esClient as never, {
      index: '.kibana-threat-reports-000001',
      id: 'report-1',
      doc: {},
    });

    expect(esClient.update.mock.calls[0][0]).not.toHaveProperty('doc_as_upsert');
    expect(esClient.update.mock.calls[0][0]).not.toHaveProperty('upsert');
  });
});
