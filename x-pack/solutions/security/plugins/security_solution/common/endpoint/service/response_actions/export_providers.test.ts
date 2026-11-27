/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExportProvider } from '../../types';
import {
  getExportProviderFieldErrors as getFieldErrors,
  getExportProviderAccountKeyError,
  getExportPath,
  isValidExportPath,
  EXPORT_PATH_MAX_LENGTH,
} from './export_providers';

/** The server passes unvalidated JSON, so the tests pass values of any type */
const getExportProviderFieldErrors = (
  provider: Record<string, unknown>,
  otherIds: readonly string[]
) => getFieldErrors(provider as Partial<ExportProvider>, otherIds);

describe('getExportProviderFieldErrors', () => {
  const validProvider = {
    id: 'azure-1',
    type: 'azure_blob',
    account_name: 'myaccount',
    container: 'my-container',
  };

  it('returns no errors for a valid minimal provider', () => {
    expect(getExportProviderFieldErrors(validProvider, [])).toEqual({});
  });

  it.each([
    'https://myaccount.blob.core.windows.net',
    'https://myaccount.blob.core.windows.net/',
    'https://myaccount.blob.core.usgovcloudapi.net',
    'https://myaccount.blob.core.chinacloudapi.cn',
    'https://MYACCOUNT.BLOB.CORE.WINDOWS.NET',
    'https://myaccount.blob.core.windows.net:443/my-container',
  ])('returns no errors for a valid service_url %s', (serviceUrl) => {
    expect(getExportProviderFieldErrors({ ...validProvider, service_url: serviceUrl }, [])).toEqual(
      {}
    );
  });

  describe('id', () => {
    it.each([
      ['undefined', undefined],
      ['null', null],
      ['empty string', ''],
    ])('is required when %s', (_desc, id) => {
      expect(getExportProviderFieldErrors({ ...validProvider, id }, [])).toEqual({
        id: 'required',
      });
    });

    it.each([
      ['number', 1],
      ['object', {}],
      ['array', []],
      ['boolean', true],
    ])('is invalid_format when not a string (%s)', (_desc, id) => {
      expect(getExportProviderFieldErrors({ ...validProvider, id }, [])).toEqual({
        id: 'invalid_format',
      });
    });

    it('allows exactly 64 characters', () => {
      const id = 'a'.repeat(64);
      expect(getExportProviderFieldErrors({ ...validProvider, id }, [])).toEqual({});
    });

    it('is too_long at 65 characters', () => {
      const id = 'a'.repeat(65);
      expect(getExportProviderFieldErrors({ ...validProvider, id }, [])).toEqual({
        id: 'too_long',
      });
    });

    it.each([
      ['space', 'azure 1'],
      ['dot', 'azure.1'],
      ['unicode', 'azuré-1'],
      ['leading whitespace', ' azure-1'],
      ['trailing whitespace', 'azure-1 '],
    ])('is invalid_format for %s', (_desc, id) => {
      expect(getExportProviderFieldErrors({ ...validProvider, id }, [])).toEqual({
        id: 'invalid_format',
      });
    });

    it('is duplicate for an exact case-sensitive match in otherIds', () => {
      expect(
        getExportProviderFieldErrors({ ...validProvider, id: 'azure-1' }, ['azure-1'])
      ).toEqual({ id: 'duplicate' });
    });

    it('is not duplicate when only the case differs', () => {
      expect(
        getExportProviderFieldErrors({ ...validProvider, id: 'azure-1' }, ['AZURE-1'])
      ).toEqual({});
    });
  });

  describe('type', () => {
    it.each([
      ['undefined', undefined],
      ['null', null],
      ['empty string', ''],
    ])('is required when %s', (_desc, type) => {
      expect(getExportProviderFieldErrors({ ...validProvider, type }, [])).toEqual({
        type: 'required',
      });
    });

    it.each([
      ['s3', 's3'],
      ['wrong case', 'AZURE_BLOB'],
      ['number', 1],
    ])('is unsupported for %s (%p)', (_desc, type) => {
      expect(getExportProviderFieldErrors({ ...validProvider, type }, [])).toEqual({
        type: 'unsupported',
      });
    });
  });

  describe('account_name', () => {
    it.each([
      ['undefined', undefined],
      ['null', null],
      ['empty string', ''],
    ])('is required when %s', (_desc, accountName) => {
      expect(
        getExportProviderFieldErrors({ ...validProvider, account_name: accountName }, [])
      ).toEqual({ account_name: 'required' });
    });

    it.each([2, 25])('is invalid_format at length %i', (length) => {
      const accountName = 'a'.repeat(length);
      expect(
        getExportProviderFieldErrors({ ...validProvider, account_name: accountName }, [])
      ).toEqual({ account_name: 'invalid_format' });
    });

    it.each([3, 24])('is valid at length %i', (length) => {
      const accountName = 'a'.repeat(length);
      expect(
        getExportProviderFieldErrors({ ...validProvider, account_name: accountName }, [])
      ).toEqual({});
    });

    it('is invalid_format for uppercase letters', () => {
      expect(
        getExportProviderFieldErrors({ ...validProvider, account_name: 'MyAccount' }, [])
      ).toEqual({ account_name: 'invalid_format' });
    });

    it('is invalid_format when not a string', () => {
      expect(getExportProviderFieldErrors({ ...validProvider, account_name: 1 }, [])).toEqual({
        account_name: 'invalid_format',
      });
    });
  });

  describe('container', () => {
    it.each([
      ['undefined', undefined],
      ['null', null],
      ['empty string', ''],
    ])('is required when %s', (_desc, container) => {
      expect(getExportProviderFieldErrors({ ...validProvider, container }, [])).toEqual({
        container: 'required',
      });
    });

    it.each([2, 64])('is invalid_format at length %i', (length) => {
      const container = 'a'.repeat(length);
      expect(getExportProviderFieldErrors({ ...validProvider, container }, [])).toEqual({
        container: 'invalid_format',
      });
    });

    it.each([3, 63])('is valid at length %i', (length) => {
      const container = 'a'.repeat(length);
      expect(getExportProviderFieldErrors({ ...validProvider, container }, [])).toEqual({});
    });

    it('is invalid_format for uppercase letters', () => {
      expect(
        getExportProviderFieldErrors({ ...validProvider, container: 'MyContainer' }, [])
      ).toEqual({ container: 'invalid_format' });
    });

    it('is invalid_format for a double hyphen', () => {
      expect(
        getExportProviderFieldErrors({ ...validProvider, container: 'my--container' }, [])
      ).toEqual({ container: 'invalid_format' });
    });

    it('is invalid_format for a leading hyphen', () => {
      expect(
        getExportProviderFieldErrors({ ...validProvider, container: '-container' }, [])
      ).toEqual({ container: 'invalid_format' });
    });

    it('is invalid_format for a trailing hyphen', () => {
      expect(
        getExportProviderFieldErrors({ ...validProvider, container: 'container-' }, [])
      ).toEqual({ container: 'invalid_format' });
    });

    it('is invalid_format when not a string', () => {
      expect(getExportProviderFieldErrors({ ...validProvider, container: 1 }, [])).toEqual({
        container: 'invalid_format',
      });
    });
  });

  describe('service_url', () => {
    it('has no error when undefined', () => {
      expect(
        getExportProviderFieldErrors({ ...validProvider, service_url: undefined }, [])
      ).toEqual({});
    });

    it('is not_https for an http URL', () => {
      expect(
        getExportProviderFieldErrors(
          { ...validProvider, service_url: 'http://myaccount.blob.core.windows.net' },
          []
        )
      ).toEqual({ service_url: 'not_https' });
    });

    it('is invalid_format for a non-URL string', () => {
      expect(
        getExportProviderFieldErrors({ ...validProvider, service_url: 'not a url' }, [])
      ).toEqual({ service_url: 'invalid_format' });
    });

    it('is invalid_format for an empty string', () => {
      expect(getExportProviderFieldErrors({ ...validProvider, service_url: '' }, [])).toEqual({
        service_url: 'invalid_format',
      });
    });

    it('is invalid_format when it has a username/password', () => {
      expect(
        getExportProviderFieldErrors(
          { ...validProvider, service_url: 'https://user:pass@myaccount.blob.core.windows.net' },
          []
        )
      ).toEqual({ service_url: 'invalid_format' });
    });

    it('is invalid_format when it has a query (e.g. a SAS token)', () => {
      expect(
        getExportProviderFieldErrors(
          { ...validProvider, service_url: 'https://myaccount.blob.core.windows.net?sig=abc' },
          []
        )
      ).toEqual({ service_url: 'invalid_format' });
    });

    it('is invalid_format when it has a fragment', () => {
      expect(
        getExportProviderFieldErrors(
          { ...validProvider, service_url: 'https://myaccount.blob.core.windows.net#frag' },
          []
        )
      ).toEqual({ service_url: 'invalid_format' });
    });

    it('is invalid_format when it contains whitespace', () => {
      expect(
        getExportProviderFieldErrors(
          { ...validProvider, service_url: 'https://myaccount.blob.core.windows.net/ path' },
          []
        )
      ).toEqual({ service_url: 'invalid_format' });
    });

    // WHATWG `new URL()` accepts or normalizes most of these, but Endpoint gets the raw string
    it.each([
      ['an empty query', 'https://myaccount.blob.core.windows.net/?'],
      ['an empty fragment', 'https://myaccount.blob.core.windows.net/#'],
      ['user info without a password', 'https://user@myaccount.blob.core.windows.net'],
      ['a single slash after the scheme', 'https:/myaccount.blob.core.windows.net'],
      ['three slashes after the scheme', 'https:///myaccount.blob.core.windows.net'],
      ['backslashes', 'https:\\\\myaccount.blob.core.windows.net'],
      ['an uppercase scheme', 'HTTPS://myaccount.blob.core.windows.net'],
      ['a C0 control character', 'https://myaccount.blob.core.windows.net/\u0001'],
      ['a NUL character', 'https://myaccount\u0000.blob.core.windows.net'],
      ['a DEL character', 'https://myaccount.blob.core.windows.net/\u007F'],
      ['a soft hyphen', 'https://my\u00ADaccount.blob.core.windows.net'],
      // Cyrillic `а` (U+0430) instead of a Latin `a`
      ['an IDN homograph', 'https://my\u0430ccount.blob.core.windows.net'],
    ])('is invalid_format for %s', (_desc, serviceUrl) => {
      expect(
        getExportProviderFieldErrors({ ...validProvider, service_url: serviceUrl }, [])
      ).toEqual({ service_url: 'invalid_format' });
    });

    it.each([
      ['a non-Azure host', 'https://example.com'],
      ['the Azure Storage emulator', 'https://localhost:10000/myaccount/my-container'],
      ['a look-alike suffix', 'https://blob.core.windows.net.evil.com'],
      ['a suffix without a dot before it', 'https://evilblob.core.windows.net'],
      ['the bare suffix', 'https://blob.core.windows.net'],
      ['a trailing dot', 'https://myaccount.blob.core.windows.net.'],
      ['an empty label', 'https://myaccount..blob.core.windows.net'],
      // `URL` accepts these in the hostname; another parser could end the host before them
      ['a semicolon in the host', 'https://evil.com;.blob.core.windows.net'],
      ['an ampersand in the host', 'https://evil.com&.blob.core.windows.net'],
      ['another Azure Storage service', 'https://myaccount.file.core.windows.net'],
    ])('is not_azure_blob_host for %s', (_desc, serviceUrl) => {
      expect(
        getExportProviderFieldErrors({ ...validProvider, service_url: serviceUrl }, [])
      ).toEqual({ service_url: 'not_azure_blob_host' });
    });

    it('is not_https before the host check', () => {
      expect(
        getExportProviderFieldErrors({ ...validProvider, service_url: 'http://example.com' }, [])
      ).toEqual({ service_url: 'not_https' });
    });

    it('is valid at exactly 2048 characters', () => {
      const serviceUrl = `https://myaccount.blob.core.windows.net/${'a'.repeat(
        2048 - 'https://myaccount.blob.core.windows.net/'.length
      )}`;
      expect(serviceUrl.length).toBe(2048);
      expect(
        getExportProviderFieldErrors({ ...validProvider, service_url: serviceUrl }, [])
      ).toEqual({});
    });

    it('is too_long at 2049 characters', () => {
      const serviceUrl = `https://myaccount.blob.core.windows.net/${'a'.repeat(
        2049 - 'https://myaccount.blob.core.windows.net/'.length
      )}`;
      expect(serviceUrl.length).toBe(2049);
      expect(
        getExportProviderFieldErrors({ ...validProvider, service_url: serviceUrl }, [])
      ).toEqual({ service_url: 'too_long' });
    });
  });
});

describe('getExportProviderAccountKeyError', () => {
  // 64 random bytes, base64-encoded: a realistic Azure storage account key
  const REALISTIC_ACCOUNT_KEY =
    'BwsPExcbHyMnKy8zNzs/Q0dLT1NXW19jZ2tvc3d7f4OHi4+Tl5ufo6err7O3u7/Dx8vP09fb3+Pn6+/z9/v/Aw==';

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['empty string', ''],
  ])('is required when %s', (_desc, key) => {
    expect(getExportProviderAccountKeyError(key)).toBe('required');
  });

  it('is invalid_format when not a string', () => {
    expect(getExportProviderAccountKeyError(1234)).toBe('invalid_format');
  });

  it.each([
    ['86 same-character base64 characters padded with ==', `${'A'.repeat(86)}==`],
    ['a realistic mixed-character key', REALISTIC_ACCOUNT_KEY],
  ])('is valid for %s', (_desc, key) => {
    expect(getExportProviderAccountKeyError(key)).toBeUndefined();
  });

  it.each([
    ['87 characters', `${'A'.repeat(85)}==`],
    ['89 characters', `${'A'.repeat(87)}==`],
    ['missing padding', `${'A'.repeat(88)}`],
    ['a single trailing =', `${'A'.repeat(87)}=`],
    ['a leading space', ` ${'A'.repeat(85)}==`],
    ['a trailing newline', `${'A'.repeat(86)}==\n`],
    ['a URL-safe base64 "-" character', `${'A'.repeat(85)}-==`],
    ['a URL-safe base64 "_" character', `${'A'.repeat(85)}_==`],
  ])('is invalid_format for %s', (_desc, key) => {
    expect(getExportProviderAccountKeyError(key)).toBe('invalid_format');
  });
});

describe('getExportPath', () => {
  it('is `<action id>/upload.zip`', () => {
    expect(getExportPath('abc')).toBe('abc/upload.zip');
  });
});

describe('isValidExportPath', () => {
  it.each([
    [
      'the path Kibana chooses for an action id',
      getExportPath('6f2b0c1e-6a43-4c55-9d0a-2f1b7c3e9a10'),
    ],
    ['1 character', 'a'],
    ['1024 characters', 'a'.repeat(EXPORT_PATH_MAX_LENGTH)],
  ])('accepts %s', (_desc, path) => {
    expect(isValidExportPath(path)).toBe(true);
  });

  it.each([
    ['0 characters', ''],
    ['1025 characters', 'a'.repeat(EXPORT_PATH_MAX_LENGTH + 1)],
    ['a leading "/"', '/a/upload.zip'],
    ['a trailing "/"', 'a/upload.zip/'],
    ['a "." segment', 'a/./upload.zip'],
    ['a ".." segment', 'a/../upload.zip'],
    ['a space', 'a b/upload.zip'],
    ['a "\\"', 'a\\upload.zip'],
    ['a "%"', 'a%2Fb/upload.zip'],
    ['a "?"', 'a/upload.zip?x'],
    ['a "#"', 'a/upload.zip#x'],
    ['a non-ASCII character', 'é/upload.zip'],
  ])('rejects %s', (_desc, path) => {
    expect(isValidExportPath(path)).toBe(false);
  });
});
