/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { SERVICE_ENVIRONMENT } from '@kbn/apm-types';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { CORE_WEB_VITALS } from '../../../common/core_web_vitals';
import {
  SESSIONS_INDEX,
  SESSIONS_INDEX_PATTERN,
  SESSIONS_INDEX_TEMPLATE_NAME,
  SESSIONS_MANAGED_BY,
  SESSIONS_VERSION,
} from '../../../common/sessions';
import { SESSION_ATTRIBUTE_FIELDS } from '../../../common/session_attribute_fields';
import { ENVIRONMENT_FIELDS } from '../../lib/otel/queries';
import {
  createSessionsIndex,
  deleteExpiredSessions,
  deleteOtherSessionsIndices,
  putSessionsIndexTemplate,
  sessionsIndexMappings,
  sessionsIndexTemplate,
  type SessionDocument,
} from './sessions_index';

type Client = ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

interface MappingNode {
  type?: string;
  properties?: Record<string, MappingNode>;
}

const NOW = Date.parse('2026-10-27T12:00:00.000Z');

const samples = { count: 4, good: 2, needs_improvement: 1, poor: 1 };

/** A summary with every field set, so each one's path can be checked against the mappings. */
const fullDocument: SessionDocument = {
  session: { id: 'session-a' },
  service: { name: 'storefront-web' },
  start_time: '2026-10-27T10:00:00.000Z',
  end_time: '2026-10-27T10:05:00.000Z',
  duration_ms: 300_000,
  event_count: 20,
  page_view_count: 3,
  page_load_count: 1,
  click_count: 4,
  js_error_count: 2,
  http_request_count: 5,
  http_failed_request_count: 1,
  bounced: false,
  entry_page: '/',
  exit_page: '/cart',
  journey: ['/', '/cart'],
  environment: 'production',
  user: { key: 'ana@example.com' },
  user_agent: { browser: 'Chrome', browser_version: '130', os: 'macOS', device: 'desktop' },
  geo: { country_iso: 'ES', region: 'Madrid', city: 'Madrid' },
  web_vitals: { lcp: 2100, inp: 120, cls: 0.05, fcp: 900, ttfb: 300 },
  web_vital_samples: { lcp: samples, inp: samples, cls: samples, fcp: samples, ttfb: samples },
  search: ['session-a', 'ana@example.com'],
};

const documentPaths = (value: object, prefix = ''): string[] =>
  Object.entries(value).flatMap(([name, field]) =>
    field !== null && typeof field === 'object' && !Array.isArray(field)
      ? documentPaths(field, `${prefix}${name}.`)
      : [`${prefix}${name}`]
  );

const mappedPaths = (properties: Record<string, MappingNode>, prefix = ''): string[] =>
  Object.entries(properties).flatMap(([name, mapping]) =>
    mapping.properties ? mappedPaths(mapping.properties, `${prefix}${name}.`) : [`${prefix}${name}`]
  );

const esError = (statusCode: number, type?: string) =>
  new errors.ResponseError({
    statusCode,
    body: type ? { error: { type } } : {},
    headers: {},
    warnings: null,
    meta: {} as never,
  });

describe('sessions index', () => {
  let client: Client;

  beforeEach(() => {
    client = elasticsearchServiceMock.createElasticsearchClient();
  });

  describe('mappings', () => {
    it('maps every field of the summary document, and nothing else', () => {
      expect(mappedPaths(sessionsIndexMappings.properties).sort()).toEqual(
        documentPaths(fullDocument).sort()
      );
      expect(sessionsIndexMappings.dynamic).toBe(false);
    });

    it('maps the samples of each web vital by rating', () => {
      for (const vital of CORE_WEB_VITALS) {
        expect(
          Object.keys(
            sessionsIndexMappings.properties.web_vital_samples.properties[vital].properties
          )
        ).toEqual(['count', 'good', 'needs_improvement', 'poor']);
        expect(sessionsIndexMappings.properties.web_vitals.properties[vital]).toEqual({
          type: 'double',
        });
      }
    });

    it('searches anywhere in a value with a wildcard field', () => {
      expect(sessionsIndexMappings.properties.search).toEqual({ type: 'wildcard' });
    });

    it('bounds the environment, which the browser sets', () => {
      expect(sessionsIndexMappings.properties.environment).toEqual({
        type: 'keyword',
        ignore_above: 1024,
      });
    });

    it('reads the environment fields the raw search of the applications list matches', () => {
      // `service.environment` aliases `resource.attributes.deployment.environment`.
      const rawFieldsByStoredName = ENVIRONMENT_FIELDS.map((field) =>
        field === SERVICE_ENVIRONMENT ? 'resource.attributes.deployment.environment' : field
      );

      expect([...SESSION_ATTRIBUTE_FIELDS.environment].sort()).toEqual(
        rawFieldsByStoredName.sort()
      );
    });
  });

  describe('template', () => {
    it('applies to every version of the sessions index, sorted by start time', () => {
      expect(sessionsIndexTemplate).toEqual(
        expect.objectContaining({
          name: SESSIONS_INDEX_TEMPLATE_NAME,
          index_patterns: [SESSIONS_INDEX_PATTERN],
          _meta: { managed: true, managed_by: SESSIONS_MANAGED_BY, version: SESSIONS_VERSION },
        })
      );
      expect(sessionsIndexTemplate.template?.mappings).toBe(sessionsIndexMappings);
      expect(sessionsIndexTemplate.template?.settings).toEqual({
        'index.sort.field': ['start_time', 'session.id'],
        'index.sort.order': ['desc', 'asc'],
      });
      expect(SESSIONS_INDEX).toBe(`digital-experience-sessions-${SESSIONS_VERSION}`);
    });

    it('puts the template with the given client and signal', async () => {
      const { signal } = new AbortController();

      await putSessionsIndexTemplate(client, signal);

      expect(client.indices.putIndexTemplate).toHaveBeenCalledWith(sessionsIndexTemplate, {
        signal,
      });
    });
  });

  describe('createSessionsIndex', () => {
    it('creates the index of this version and says so', async () => {
      const { signal } = new AbortController();

      expect(await createSessionsIndex(client, signal)).toBe(true);
      expect(client.indices.create).toHaveBeenCalledWith({ index: SESSIONS_INDEX }, { signal });
    });

    it('keeps an existing index, without needing view_index_metadata to check for it', async () => {
      client.indices.create.mockRejectedValue(esError(400, 'resource_already_exists_exception'));

      expect(await createSessionsIndex(client)).toBe(false);
      expect(client.indices.exists).not.toHaveBeenCalled();
    });

    it.each([
      ['a 400 of another type', esError(400, 'illegal_argument_exception')],
      ['a 403', esError(403)],
      ['a connection error', new Error('connect ECONNREFUSED')],
    ])('rethrows %s', async (_name, error) => {
      client.indices.create.mockRejectedValue(error);

      await expect(createSessionsIndex(client)).rejects.toBe(error);
    });
  });

  describe('deleteOtherSessionsIndices', () => {
    it('deletes the indices of other versions by name, open or closed', async () => {
      const older = 'digital-experience-sessions-0';
      const newer = `digital-experience-sessions-${SESSIONS_VERSION + 1}`;
      client.indices.get.mockResolvedValue({ [older]: {}, [SESSIONS_INDEX]: {}, [newer]: {} });
      const { signal } = new AbortController();

      expect(await deleteOtherSessionsIndices(client, signal)).toEqual([older, newer]);
      expect(client.indices.get).toHaveBeenCalledWith(
        {
          index: SESSIONS_INDEX_PATTERN,
          allow_no_indices: true,
          expand_wildcards: ['open', 'closed'],
        },
        { signal }
      );
      expect(client.indices.delete).toHaveBeenCalledWith(
        { index: [older, newer], ignore_unavailable: true },
        { signal }
      );
    });

    it('deletes nothing when only this version exists', async () => {
      client.indices.get.mockResolvedValue({ [SESSIONS_INDEX]: {} });

      expect(await deleteOtherSessionsIndices(client)).toEqual([]);
      expect(client.indices.delete).not.toHaveBeenCalled();
    });

    it('deletes nothing when no sessions index exists', async () => {
      client.indices.get.mockResolvedValue({});

      expect(await deleteOtherSessionsIndices(client)).toEqual([]);
      expect(client.indices.delete).not.toHaveBeenCalled();
    });
  });

  describe('deleteExpiredSessions', () => {
    it('deletes the sessions that ended before the lookback and a day, in the background', async () => {
      const { signal } = new AbortController();

      await deleteExpiredSessions(client, NOW, signal);

      expect(client.deleteByQuery).toHaveBeenCalledWith(
        {
          index: SESSIONS_INDEX_PATTERN,
          allow_no_indices: true,
          ignore_unavailable: true,
          conflicts: 'proceed',
          wait_for_completion: false,
          // 30 days of lookback plus one of margin.
          query: { range: { end_time: { lt: '2026-09-26T12:00:00.000Z' } } },
        },
        { signal }
      );
    });
  });
});
