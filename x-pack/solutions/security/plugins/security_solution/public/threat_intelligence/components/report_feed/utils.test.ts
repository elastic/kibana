/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  decodeDataHtmlReportUrl,
  getSourceFaviconUrl,
  isBrowsableReportUrl,
  onBrowsableReportUrlClick,
  openDataHtmlReportUrl,
} from './utils';

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

describe('decodeDataHtmlReportUrl', () => {
  it('returns decoded HTML for percent-encoded data:text/html URLs', () => {
    expect(
      decodeDataHtmlReportUrl('data:text/html;charset=utf-8,%3Ch1%3EReport%3C%2Fh1%3E')
    ).toBe('<h1>Report</h1>');
  });

  it('returns undefined for https URLs', () => {
    expect(decodeDataHtmlReportUrl('https://example.com/a')).toBeUndefined();
  });
});

describe('openDataHtmlReportUrl', () => {
  it('opens a blob URL for data:text/html articles', () => {
    const open = jest.fn().mockReturnValue({} as Window);
    const createObjectURL = jest.fn().mockReturnValue('blob:mock');
    const revokeObjectURL = jest.fn();
    const setTimeoutFn = jest.fn();

    openDataHtmlReportUrl('data:text/html;charset=utf-8,%3Ch1%3EReport%3C%2Fh1%3E', {
      open,
      createObjectURL,
      revokeObjectURL,
      setTimeoutFn,
    });

    expect(open).toHaveBeenCalledWith('blob:mock', '_blank', 'noopener,noreferrer');
  });
});

describe('onBrowsableReportUrlClick', () => {
  it('prevents default for data:text/html URLs', () => {
    const preventDefault = jest.fn();
    onBrowsableReportUrlClick(
      { preventDefault },
      'data:text/html;charset=utf-8,%3Ch1%3EReport%3C%2Fh1%3E',
      {
        open: jest.fn().mockReturnValue(null),
        createObjectURL: jest.fn().mockReturnValue('blob:mock'),
        revokeObjectURL: jest.fn(),
        setTimeoutFn: jest.fn(),
      }
    );
    expect(preventDefault).toHaveBeenCalled();
  });

  it('does not prevent default for https URLs', () => {
    const preventDefault = jest.fn();
    onBrowsableReportUrlClick({ preventDefault }, 'https://example.com/a');
    expect(preventDefault).not.toHaveBeenCalled();
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
