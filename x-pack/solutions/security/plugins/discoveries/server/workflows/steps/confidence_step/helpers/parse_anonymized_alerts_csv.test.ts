/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseAnonymizedAlertsCsv, splitMultiValue } from './parse_anonymized_alerts_csv';

describe('parseAnonymizedAlertsCsv', () => {
  it('parses field,value lines and keys the row by its _id', () => {
    const byId = parseAnonymizedAlertsCsv([
      {
        page_content:
          '@timestamp,2024-10-16T02:40:08.837Z\n' +
          '_id,abc123\n' +
          'event.category,malware,intrusion_detection\n' +
          'event.dataset,endpoint.alerts\n' +
          'host.name,uuid-1',
      },
    ]);

    const row = byId.get('abc123');
    expect(row).toBeDefined();
    expect(row?.['@timestamp']).toBe('2024-10-16T02:40:08.837Z');
    // multi-value fields keep their comma-joined form
    expect(row?.['event.category']).toBe('malware,intrusion_detection');
    expect(row?.['event.dataset']).toBe('endpoint.alerts');
    expect(row?.['host.name']).toBe('uuid-1');
  });

  it('splits on the FIRST comma only so values may contain commas', () => {
    const byId = parseAnonymizedAlertsCsv([
      { page_content: '_id,x\nprocess.command_line,wscript,C:\\a.vbs,/o' },
    ]);
    expect(byId.get('x')?.['process.command_line']).toBe('wscript,C:\\a.vbs,/o');
  });

  it('falls back to the document id when page_content has no _id line', () => {
    const byId = parseAnonymizedAlertsCsv([
      { id: 'doc-1', page_content: 'event.dataset,endpoint.alerts' },
    ]);
    expect(byId.get('doc-1')?.['event.dataset']).toBe('endpoint.alerts');
  });

  it('skips lines without a comma and empty field names', () => {
    const byId = parseAnonymizedAlertsCsv([
      {
        page_content: '_id,y\nnojustonetoken\n,leadingcommavalue\nevent.module,endpoint',
      },
    ]);
    const row = byId.get('y');
    expect(row).toEqual({ _id: 'y', 'event.module': 'endpoint' });
  });

  it('ignores alerts with neither an _id line nor a document id', () => {
    const byId = parseAnonymizedAlertsCsv([{ page_content: 'event.dataset,x' }]);
    expect(byId.size).toBe(0);
  });
});

describe('splitMultiValue', () => {
  it('splits, trims, and de-duplicates comma-separated values', () => {
    expect(splitMultiValue('malware, intrusion_detection , malware')).toEqual([
      'malware',
      'intrusion_detection',
    ]);
  });

  it('returns an empty array for undefined or empty input', () => {
    expect(splitMultiValue(undefined)).toEqual([]);
    expect(splitMultiValue('')).toEqual([]);
  });
});
