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

import { listReportAdapters, registerReportAdapter, renderReport } from '.';
import type { ReportAdapter, ReportDocument } from './types';

const doc: ReportDocument = {
  title: 'Report',
  sections: [{ id: 's1', title: 'Suite 1', examples: [{ id: 'ex-1', status: 'completed' }] }],
};

describe('adapter registry', () => {
  it('ships html and json adapters', () => {
    expect(listReportAdapters()).toEqual(expect.arrayContaining(['html', 'json']));
  });

  it('uses the html adapter by default', () => {
    const result = renderReport(doc);
    expect(result).toMatchObject({ adapter: 'html', fellBackTo: 'none' });
    expect(result.output).toContain('<!DOCTYPE html>');
  });

  it('renders with a registered custom adapter', () => {
    const md: ReportAdapter = { name: 'md', render: (d) => `# ${d.title}` };
    registerReportAdapter(md);
    const result = renderReport(doc, 'md');
    expect(result).toMatchObject({ adapter: 'md', fellBackTo: 'none' });
    expect(result.output).toBe('# Report');
  });

  it('re-registering an existing name replaces it', () => {
    registerReportAdapter({ name: 'md', render: () => 'v2' });
    expect(renderReport(doc, 'md').output).toBe('v2');
  });

  it('refuses to replace the reserved json fallback', () => {
    expect(() => registerReportAdapter({ name: 'json', render: () => 'nope' })).toThrow(/reserved/);
    expect(renderReport(doc, 'json').output).toContain('"title"');
  });
});

describe('JSON fallback', () => {
  it('falls back to json for an unknown adapter name', () => {
    const result = renderReport(doc, 'nope');
    expect(result.adapter).toBe('json');
    expect(result.fellBackTo).toBe('json');
    expect(result.error).toContain("Unknown report adapter 'nope'");
    expect(JSON.parse(result.output)).toEqual(doc);
  });

  it('falls back to json when an adapter throws, surfacing the error', () => {
    registerReportAdapter({
      name: 'boom',
      render: () => {
        throw new Error('adapter exploded');
      },
    });
    const result = renderReport(doc, 'boom');
    expect(result.adapter).toBe('json');
    expect(result.fellBackTo).toBe('json');
    expect(result.error).toBe('adapter exploded');
    expect(JSON.parse(result.output)).toEqual(doc);
  });
});
