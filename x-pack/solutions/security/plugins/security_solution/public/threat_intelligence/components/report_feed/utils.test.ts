/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSourceFaviconUrl, isBrowsableReportUrl } from './utils';

describe('isBrowsableReportUrl', () => {
  it('returns true for https URLs', () => {
    expect(isBrowsableReportUrl('https://example.com/a')).toBe(true);
  });

  it('returns true for http URLs', () => {
    expect(isBrowsableReportUrl('http://example.com/a')).toBe(true);
  });

  it('returns true for data:text/html article URLs with charset', () => {
    expect(
      isBrowsableReportUrl('data:text/html;charset=utf-8,%3Ch1%3EReport%3C%2Fh1%3E')
    ).toBe(true);
  });

  it('returns true for data:text/html without charset', () => {
    expect(isBrowsableReportUrl('data:text/html,%3Ch1%3EReport%3C%2Fh1%3E')).toBe(true);
  });

  it('returns false for data:image/svg+xml URLs', () => {
    expect(isBrowsableReportUrl('data:image/svg+xml,<svg></svg>')).toBe(false);
  });

  it('returns false for data:application/javascript URLs', () => {
    expect(isBrowsableReportUrl('data:application/javascript,alert(1)')).toBe(false);
  });

  it('returns false for data:text/plain URLs', () => {
    expect(isBrowsableReportUrl('data:text/plain,hello')).toBe(false);
  });

  it('returns false for javascript URLs', () => {
    expect(isBrowsableReportUrl('javascript:alert(1)')).toBe(false);
  });

  it('returns false for invalid URLs', () => {
    expect(isBrowsableReportUrl('not a url')).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isBrowsableReportUrl(undefined)).toBe(false);
  });
});

describe('getSourceFaviconUrl', () => {
  it('returns a Google favicon URL for https sources', () => {
    expect(getSourceFaviconUrl('https://example.com/a')).toBe(
      'https://www.google.com/s2/favicons?domain=example.com&sz=32'
    );
  });

  it('returns undefined for data: article URLs', () => {
    expect(
      getSourceFaviconUrl('data:text/html;charset=utf-8,%3Ch1%3EReport%3C%2Fh1%3E')
    ).toBeUndefined();
  });

  it('returns undefined for javascript URLs', () => {
    expect(getSourceFaviconUrl('javascript:alert(1)')).toBeUndefined();
  });

  it('returns undefined for invalid URLs', () => {
    expect(getSourceFaviconUrl('not a url')).toBeUndefined();
  });

  it('returns undefined when sourceUrl is missing', () => {
    expect(getSourceFaviconUrl(undefined)).toBeUndefined();
  });
});
