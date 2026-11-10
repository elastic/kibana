/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ingestThreatReport } from './ingest_threat_report';

describe('ingestThreatReport', () => {
  it('indexes the document with op_type create against the threat reports index', async () => {
    const esClient = { index: jest.fn().mockResolvedValue({ _id: 'minted-id-1' }) };
    const document = { content_fingerprint: 'abc123', content: { title: 'Report' } };

    const result = await ingestThreatReport(esClient as never, document);

    expect(esClient.index).toHaveBeenCalledWith({
      index: '.kibana-threat-reports',
      op_type: 'create',
      document,
    });
    expect(result).toEqual({ reportId: 'minted-id-1' });
  });

  it('sends no explicit id, letting Elasticsearch mint one', async () => {
    const esClient = { index: jest.fn().mockResolvedValue({ _id: 'minted-id-2' }) };

    await ingestThreatReport(esClient as never, { content_fingerprint: 'def456' });

    expect(esClient.index.mock.calls[0][0]).not.toHaveProperty('id');
  });
});
