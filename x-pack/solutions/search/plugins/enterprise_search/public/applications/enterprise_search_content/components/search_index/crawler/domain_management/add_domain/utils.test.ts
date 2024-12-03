/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../../../../__mocks__/kea_logic';

import {
  domainValidationFailureResultChange,
  domainValidationStateToPanelColor,
  extractDomainAndEntryPointFromUrl,
  getDomainWithProtocol,
} from './utils';

describe('extractDomainAndEntryPointFromUrl', () => {
  it('extracts a provided entry point and domain', () => {
    expect(extractDomainAndEntryPointFromUrl('https://elastic.co/guide')).toEqual({
      domain: 'https://elastic.co',
      entryPoint: '/guide',
    });
  });

  it('provides a default entry point if there is only a domain', () => {
    expect(extractDomainAndEntryPointFromUrl('https://elastic.co')).toEqual({
      domain: 'https://elastic.co',
      entryPoint: '/',
    });
  });
});

describe('getDomainWithProtocol', () => {
  const { http } = mockHttpValues;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes through domain if it starts with https', async () => {
    const result = await getDomainWithProtocol('https://elastic.co');

    expect(result).toEqual('https://elastic.co');
    expect(http.post).toHaveBeenCalledTimes(0);
  });

  it('passes through domain if it starts with http', async () => {
    const result = await getDomainWithProtocol('http://elastic.co');

    expect(result).toEqual('http://elastic.co');
    expect(http.post).toHaveBeenCalledTimes(0);
  });

  it('returns domain with https protocol if the back-end validates https', async () => {
    http.post.mockReturnValueOnce(Promise.resolve({ valid: true }));
    const result = await getDomainWithProtocol('elastic.co');

    expect(result).toEqual('https://elastic.co');
    expect(http.post).toHaveBeenCalledTimes(1);
    expect(http.post).toHaveBeenCalledWith('/internal/enterprise_search/crawler/validate_url', {
      body: JSON.stringify({ url: 'https://elastic.co', checks: ['tcp', 'url_request'] }),
    });
  });

  it('returns domain with http protocol if the back-end validates http', async () => {
    http.post
      .mockReturnValueOnce(Promise.resolve({ valid: false }))
      .mockReturnValueOnce(Promise.resolve({ valid: true }));
    const result = await getDomainWithProtocol('elastic.co');

    expect(result).toEqual('http://elastic.co');
    expect(http.post).toHaveBeenCalledTimes(2);
    expect(http.post).toHaveBeenLastCalledWith('/internal/enterprise_search/crawler/validate_url', {
      body: JSON.stringify({ url: 'http://elastic.co', checks: ['tcp', 'url_request'] }),
    });
  });

  it('passes through domain if back-end throws error', async () => {
    http.post.mockReturnValueOnce(Promise.reject());

    const result = await getDomainWithProtocol('elastic.co');

    expect(result).toEqual('elastic.co');
    expect(http.post).toHaveBeenCalledTimes(1);
  });

  it('passes through domain if back-end fails to validate https and http', async () => {
    http.post.mockReturnValueOnce(Promise.resolve({ valid: false }));
    http.post.mockReturnValueOnce(Promise.resolve({ valid: false }));
    const result = await getDomainWithProtocol('elastic.co');

    expect(result).toEqual('elastic.co');
    expect(http.post).toHaveBeenCalledTimes(2);
  });
});

describe('domainValidationStateToPanelColor', () => {
  it('returns expected values', () => {
    expect(domainValidationStateToPanelColor('valid')).toEqual('success');
    expect(domainValidationStateToPanelColor('invalid')).toEqual('danger');
    expect(domainValidationStateToPanelColor('')).toEqual('subdued');
    expect(domainValidationStateToPanelColor('loading')).toEqual('subdued');
  });
});

describe('domainValidationFailureResultChange', () => {
  it('returns the expected results', () => {
    expect(domainValidationFailureResultChange('initialValidation')).toMatchObject({
      networkConnectivity: expect.any(Object),
      indexingRestrictions: expect.any(Object),
      contentVerification: expect.any(Object),
    });

    expect(domainValidationFailureResultChange('networkConnectivity')).toMatchObject({
      indexingRestrictions: expect.any(Object),
      contentVerification: expect.any(Object),
    });

    expect(domainValidationFailureResultChange('indexingRestrictions')).toMatchObject({
      contentVerification: expect.any(Object),
    });

    expect(domainValidationFailureResultChange('contentVerification')).toEqual({});
  });
});
