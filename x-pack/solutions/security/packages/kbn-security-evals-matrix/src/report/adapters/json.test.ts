/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements under the Elastic License 2.0; you may
 * not use this file except in compliance with the Elastic License 2.0.
 */

import { jsonReportAdapter, renderReportJson } from './json';
import type { ReportDocument } from '../types';

const doc: ReportDocument = {
  title: 'Report',
  sections: [
    {
      id: 's1',
      title: 'Suite 1',
      examples: [{ id: 'ex-1', status: 'completed', score: '1.00' }],
    },
  ],
};

describe('renderReportJson', () => {
  it('serialises the whole document, round-tripping exactly', () => {
    const output = renderReportJson(doc);
    expect(JSON.parse(output)).toEqual(doc);
  });

  it('emits pretty-printed, newline-terminated JSON', () => {
    const output = renderReportJson(doc);
    expect(output.endsWith('\n')).toBe(true);
    expect(output).toContain(',\n  "sections": [');
  });
});

describe('jsonReportAdapter', () => {
  it('is registered under the reserved name json', () => {
    expect(jsonReportAdapter.name).toBe('json');
    expect(jsonReportAdapter.render(doc)).toBe(renderReportJson(doc));
  });
});
