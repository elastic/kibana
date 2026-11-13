/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from '@kbn/core/public';
import { UI_SETTINGS } from '@kbn/data-service';
import { validateQuery } from './validate_query';

const createUiSettings = (allowLeadingWildcards: boolean) =>
  ({
    get: jest.fn((key: string) =>
      key === UI_SETTINGS.QUERY_ALLOW_LEADING_WILDCARDS ? allowLeadingWildcards : undefined
    ),
  } as unknown as IUiSettingsClient);

const kuery = (query: string) => ({ language: 'kuery', query });

describe('validateQuery', () => {
  it('accepts valid KQL', () => {
    expect(validateQuery(kuery('host.name: web-1'), createUiSettings(false))).toBeUndefined();
  });

  it('accepts an empty query', () => {
    expect(validateQuery(kuery(''), createUiSettings(false))).toBeUndefined();
  });

  it('returns the error for invalid KQL', () => {
    expect(validateQuery(kuery('foo:'), createUiSettings(false))).toBeInstanceOf(Error);
  });

  it('rejects a leading wildcard when the setting does not allow it', () => {
    expect(validateQuery(kuery('host.name: *web'), createUiSettings(false))).toBeInstanceOf(Error);
  });

  it('accepts a leading wildcard when the setting allows it', () => {
    expect(validateQuery(kuery('host.name: *web'), createUiSettings(true))).toBeUndefined();
  });

  it('does not validate a Lucene query as KQL', () => {
    expect(
      validateQuery({ language: 'lucene', query: 'foo:' }, createUiSettings(false))
    ).toBeUndefined();
  });
});
