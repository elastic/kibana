/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityStoreEuidApi } from '@kbn/entity-store/public';
import {
  buildEuidCspPreviewOptions,
  inferEntityTypeFromIdentityFields,
} from './build_euid_csp_preview_options';

const buildEuidApi = (getEuidFilterBasedOnDocument: jest.Mock): EntityStoreEuidApi =>
  ({
    euid: { dsl: { getEuidFilterBasedOnDocument } },
    getBuiltInEntityDefinition: jest.fn((entityType: string) => entityType),
  } as unknown as EntityStoreEuidApi);

const termOnHostName = jest.fn((_type: string, document: { host?: { name?: string } }) =>
  document?.host?.name ? { term: { 'host.name': document.host.name } } : undefined
);

describe('inferEntityTypeFromIdentityFields', () => {
  it('picks the entity type from the identity field prefix', () => {
    expect(inferEntityTypeFromIdentityFields({ 'user.name': 'alice' })).toBe('user');
    expect(inferEntityTypeFromIdentityFields({ 'host.name': 'h1' })).toBe('host');
    expect(inferEntityTypeFromIdentityFields({ 'service.name': 's1' })).toBe('service');
    expect(inferEntityTypeFromIdentityFields({ 'entity.id': 'x' })).toBe('generic');
  });
});

describe('buildEuidCspPreviewOptions', () => {
  beforeEach(() => {
    termOnHostName.mockClear();
  });

  it('wraps the single-record EUID filter in a bool.filter', () => {
    const options = buildEuidCspPreviewOptions(
      'host',
      { host: { name: 'h1' } },
      buildEuidApi(termOnHostName)
    );

    expect(options.enabled).toBe(true);
    expect(options.query).toEqual({ bool: { filter: [{ term: { 'host.name': 'h1' } }] } });
  });

  it('ORs the EUID filters of the primary record and its aliases in the resolution-group view', () => {
    const options = buildEuidCspPreviewOptions(
      'host',
      { host: { name: 'h1' } },
      buildEuidApi(termOnHostName),
      { aliasRecords: [{ host: { name: 'h2' } }, { host: {} }] }
    );

    expect(options.enabled).toBe(true);
    expect(options.query).toEqual({
      bool: {
        filter: [
          {
            bool: {
              should: [{ term: { 'host.name': 'h1' } }, { term: { 'host.name': 'h2' } }],
              minimum_should_match: 1,
            },
          },
        ],
      },
    });
  });

  it('combines a plain identity document with entity store alias records', () => {
    const options = buildEuidCspPreviewOptions(
      'host',
      { host: { name: 'h1' } },
      buildEuidApi(termOnHostName),
      {
        aliasRecords: [
          { entity: { id: 'e2' }, host: { name: 'h2' } },
          { entity: { id: 'e3' } },
          { entity: { id: 'e4' }, host: { name: 'h4' } },
        ],
      }
    );

    expect(options.enabled).toBe(true);
    expect(options.query).toEqual({
      bool: {
        filter: [
          {
            bool: {
              should: [
                { term: { 'host.name': 'h1' } },
                { term: { 'host.name': 'h2' } },
                { term: { 'host.name': 'h4' } },
              ],
              minimum_should_match: 1,
            },
          },
        ],
      },
    });
  });

  it('uses the alias records alone when the identity document yields no EUID filter', () => {
    const options = buildEuidCspPreviewOptions(
      'host',
      { user: { name: 'not-a-host' } },
      buildEuidApi(termOnHostName),
      { aliasRecords: [{ entity: { id: 'e2' }, host: { name: 'h2' } }] }
    );

    expect(options.enabled).toBe(true);
    expect(options.query).toEqual({ bool: { filter: [{ term: { 'host.name': 'h2' } }] } });
  });

  it('falls back to a legacy name term when no record yields an EUID filter', () => {
    const options = buildEuidCspPreviewOptions('host', undefined, buildEuidApi(termOnHostName), {
      legacyIdentityFields: { 'host.name': 'legacy-host' },
    });

    expect(options.enabled).toBe(true);
    expect(JSON.stringify(options.query)).toContain('legacy-host');
  });

  it('is disabled when neither a record nor legacy identity is available', () => {
    expect(buildEuidCspPreviewOptions('host', undefined, null).enabled).toBe(false);
  });
});
