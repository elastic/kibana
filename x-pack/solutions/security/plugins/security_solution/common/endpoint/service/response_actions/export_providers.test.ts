/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExportProvider } from '../../types';
import { getExportProviderFieldErrors as getFieldErrors } from './export_providers';

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
    'https://localhost:10000/myaccount/my-container',
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
