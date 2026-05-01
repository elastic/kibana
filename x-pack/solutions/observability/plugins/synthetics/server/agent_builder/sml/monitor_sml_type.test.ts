/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import {
  legacySyntheticsMonitorTypeSingle,
  syntheticsMonitorSavedObjectType,
} from '../../../common/types/saved_objects';
import {
  MONITOR_MANAGEMENT_ATTACHMENT_TYPE,
  MONITOR_SML_TYPE,
} from '../../../common/agent_builder';
import { ConfigKey } from '../../../common/runtime_types';
import {
  MonitorTypeEnum,
  ScheduleUnit,
} from '../../../common/runtime_types/monitor_management/monitor_configs';
import { createMonitorSmlType } from './monitor_sml_type';

const createLogger = (): jest.Mocked<Logger> =>
  ({
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    fatal: jest.fn(),
    log: jest.fn(),
    isLevelEnabled: jest.fn(() => false),
    get: jest.fn(),
  } as unknown as jest.Mocked<Logger>);

const buildHttpMonitorAttributes = (overrides: Record<string, unknown> = {}) => ({
  [ConfigKey.NAME]: 'Elastic API health',
  [ConfigKey.MONITOR_TYPE]: MonitorTypeEnum.HTTP,
  [ConfigKey.ENABLED]: true,
  [ConfigKey.SCHEDULE]: { number: '5', unit: ScheduleUnit.MINUTES },
  [ConfigKey.LOCATIONS]: [
    { id: 'us_central', label: 'North America - US Central', isServiceManaged: true },
  ],
  [ConfigKey.URLS]: 'https://api.elastic.co',
  [ConfigKey.TAGS]: ['poc'],
  [ConfigKey.NAMESPACE]: 'default',
  [ConfigKey.MAX_ATTEMPTS]: 1,
  [ConfigKey.APM_SERVICE_NAME]: '',
  ...overrides,
});

const buildSavedObjectFound = ({
  id,
  type,
  attributes = buildHttpMonitorAttributes(),
}: {
  id: string;
  type: string;
  attributes?: Record<string, unknown>;
}) => ({
  id,
  type,
  attributes,
  namespaces: ['default'],
  updated_at: '2026-04-30T17:00:00.000Z',
  created_at: '2026-04-15T10:00:00.000Z',
  references: [],
});

const buildSavedObjectMissing = ({ id, type }: { id: string; type: string }) => ({
  id,
  type,
  error: {
    statusCode: 404,
    error: 'Not Found',
    message: 'Saved object [type/id] not found',
  },
  attributes: undefined as unknown as Record<string, unknown>,
});

describe('createMonitorSmlType', () => {
  it('exposes the agreed SML type id and 5m fetch frequency', () => {
    const sml = createMonitorSmlType({ logger: createLogger() });
    expect(sml.id).toBe(MONITOR_SML_TYPE);
    expect(sml.fetchFrequency?.()).toBe('5m');
  });

  describe('list', () => {
    it('yields one page per non-empty SO type and closes both finders', async () => {
      const multiSpaceFinder = {
        find: jest.fn().mockReturnValue(
          (async function* () {
            yield {
              saved_objects: [
                {
                  id: 'config-1',
                  type: syntheticsMonitorSavedObjectType,
                  attributes: { type: MonitorTypeEnum.HTTP },
                  updated_at: '2026-04-30T17:00:00.000Z',
                  namespaces: ['default', 'team-a'],
                },
              ],
            };
          })()
        ),
        close: jest.fn().mockResolvedValue(undefined),
      };
      const legacyFinder = {
        find: jest.fn().mockReturnValue(
          (async function* () {
            yield {
              saved_objects: [
                {
                  id: 'config-2',
                  type: legacySyntheticsMonitorTypeSingle,
                  attributes: { type: MonitorTypeEnum.HTTP },
                  updated_at: '2026-04-30T18:00:00.000Z',
                  namespaces: ['default'],
                },
              ],
            };
          })()
        ),
        close: jest.fn().mockResolvedValue(undefined),
      };
      const finderQueue = [multiSpaceFinder, legacyFinder];
      const savedObjectsClient = {
        createPointInTimeFinder: jest.fn(() => finderQueue.shift()),
      };

      const sml = createMonitorSmlType({ logger: createLogger() });

      const pages = [];
      for await (const page of sml.list({
        savedObjectsClient: savedObjectsClient as never,
        esClient: {} as never,
        logger: createLogger(),
      })) {
        pages.push(page);
      }

      expect(savedObjectsClient.createPointInTimeFinder).toHaveBeenNthCalledWith(1, {
        type: syntheticsMonitorSavedObjectType,
        perPage: 1000,
        namespaces: ['*'],
        fields: [ConfigKey.MONITOR_TYPE],
      });
      expect(savedObjectsClient.createPointInTimeFinder).toHaveBeenNthCalledWith(2, {
        type: legacySyntheticsMonitorTypeSingle,
        perPage: 1000,
        namespaces: ['*'],
        fields: [ConfigKey.MONITOR_TYPE],
      });
      expect(pages).toEqual([
        [
          {
            id: 'config-1',
            updatedAt: '2026-04-30T17:00:00.000Z',
            spaces: ['default', 'team-a'],
          },
        ],
        [
          {
            id: 'config-2',
            updatedAt: '2026-04-30T18:00:00.000Z',
            spaces: ['default'],
          },
        ],
      ]);
      expect(multiSpaceFinder.close).toHaveBeenCalledTimes(1);
      expect(legacyFinder.close).toHaveBeenCalledTimes(1);
    });

    it('closes the finder even when the consumer aborts mid-iteration', async () => {
      const close = jest.fn().mockResolvedValue(undefined);
      const finder = {
        find: jest.fn().mockReturnValue(
          (async function* () {
            yield {
              saved_objects: [
                {
                  id: 'a',
                  type: syntheticsMonitorSavedObjectType,
                  attributes: {},
                  namespaces: ['default'],
                  updated_at: '2026-04-30T17:00:00.000Z',
                },
              ],
            };
            yield {
              saved_objects: [
                {
                  id: 'b',
                  type: syntheticsMonitorSavedObjectType,
                  attributes: {},
                  namespaces: ['default'],
                  updated_at: '2026-04-30T17:01:00.000Z',
                },
              ],
            };
          })()
        ),
        close,
      };
      const finderQueue = [
        finder,
        { ...finder, find: jest.fn().mockReturnValue((async function* () {})()), close: jest.fn() },
      ];
      const savedObjectsClient = {
        createPointInTimeFinder: jest.fn(() => finderQueue.shift()),
      };

      const sml = createMonitorSmlType({ logger: createLogger() });
      const iter = sml.list({
        savedObjectsClient: savedObjectsClient as never,
        esClient: {} as never,
        logger: createLogger(),
      });
      const first = await iter[Symbol.asyncIterator]().next();
      expect(first.value).toEqual([
        { id: 'a', updatedAt: '2026-04-30T17:00:00.000Z', spaces: ['default'] },
      ]);
      // Force consumer abort — `for await` would normally call return() to
      // wind down the generator; mimic that here.
      await iter[Symbol.asyncIterator]().return?.(undefined as never);

      // Allow the `try/finally` to flush. close() is fire-and-forget but
      // synchronous in our finder mock.
      expect(close).toHaveBeenCalled();
    });

    it('yields nothing (no SO) without crashing', async () => {
      const emptyFinder = () => ({
        find: jest.fn().mockReturnValue((async function* () {})()),
        close: jest.fn().mockResolvedValue(undefined),
      });
      const finderQueue = [emptyFinder(), emptyFinder()];
      const savedObjectsClient = {
        createPointInTimeFinder: jest.fn(() => finderQueue.shift()),
      };

      const sml = createMonitorSmlType({ logger: createLogger() });

      const pages = [];
      for await (const page of sml.list({
        savedObjectsClient: savedObjectsClient as never,
        esClient: {} as never,
        logger: createLogger(),
      })) {
        pages.push(page);
      }

      expect(pages).toEqual([]);
    });
  });

  describe('getSmlData', () => {
    it('emits a chunk with the multi-space permission for current-type HTTP monitors', async () => {
      const savedObjectsClient = {
        bulkGet: jest.fn().mockResolvedValue({
          saved_objects: [
            buildSavedObjectFound({
              id: 'config-1',
              type: syntheticsMonitorSavedObjectType,
            }),
            buildSavedObjectMissing({
              id: 'config-1',
              type: legacySyntheticsMonitorTypeSingle,
            }),
          ],
        }),
      };

      const sml = createMonitorSmlType({ logger: createLogger() });

      const result = await sml.getSmlData('config-1', {
        savedObjectsClient: savedObjectsClient as never,
        esClient: {} as never,
        logger: createLogger(),
      });

      expect(savedObjectsClient.bulkGet).toHaveBeenCalledWith([
        { type: syntheticsMonitorSavedObjectType, id: 'config-1' },
        { type: legacySyntheticsMonitorTypeSingle, id: 'config-1' },
      ]);
      expect(result?.chunks).toHaveLength(1);
      expect(result?.chunks[0]).toEqual({
        type: MONITOR_SML_TYPE,
        title: 'Elastic API health',
        content: expect.stringContaining('Elastic API health'),
        permissions: ['saved_object:synthetics-monitor-multi-space/get'],
      });
      expect(result?.chunks[0].content).toContain('https://api.elastic.co');
      expect(result?.chunks[0].content).toContain('http');
      expect(result?.chunks[0].content).toContain('North America - US Central');
      expect(result?.chunks[0].content).toContain('poc');
    });

    it('emits a chunk with the legacy permission when the monitor lives in the legacy SO type', async () => {
      const savedObjectsClient = {
        bulkGet: jest.fn().mockResolvedValue({
          saved_objects: [
            buildSavedObjectMissing({
              id: 'config-2',
              type: syntheticsMonitorSavedObjectType,
            }),
            buildSavedObjectFound({
              id: 'config-2',
              type: legacySyntheticsMonitorTypeSingle,
            }),
          ],
        }),
      };

      const sml = createMonitorSmlType({ logger: createLogger() });

      const result = await sml.getSmlData('config-2', {
        savedObjectsClient: savedObjectsClient as never,
        esClient: {} as never,
        logger: createLogger(),
      });

      expect(result?.chunks[0].permissions).toEqual(['saved_object:synthetics-monitor/get']);
      // Critically: only ONE chunk — never both permissions on a single chunk
      // (AND-semantics would silently hide it from most users).
      expect(result?.chunks).toHaveLength(1);
    });

    it('returns undefined for non-HTTP monitor types (v1 scope)', async () => {
      const savedObjectsClient = {
        bulkGet: jest.fn().mockResolvedValue({
          saved_objects: [
            buildSavedObjectFound({
              id: 'config-3',
              type: syntheticsMonitorSavedObjectType,
              attributes: buildHttpMonitorAttributes({
                [ConfigKey.MONITOR_TYPE]: MonitorTypeEnum.TCP,
              }),
            }),
            buildSavedObjectMissing({
              id: 'config-3',
              type: legacySyntheticsMonitorTypeSingle,
            }),
          ],
        }),
      };

      const sml = createMonitorSmlType({ logger: createLogger() });

      const result = await sml.getSmlData('config-3', {
        savedObjectsClient: savedObjectsClient as never,
        esClient: {} as never,
        logger: createLogger(),
      });

      expect(result).toBeUndefined();
    });

    it('returns undefined when no SO exists for the id', async () => {
      const savedObjectsClient = {
        bulkGet: jest.fn().mockResolvedValue({
          saved_objects: [
            buildSavedObjectMissing({
              id: 'gone',
              type: syntheticsMonitorSavedObjectType,
            }),
            buildSavedObjectMissing({
              id: 'gone',
              type: legacySyntheticsMonitorTypeSingle,
            }),
          ],
        }),
      };

      const sml = createMonitorSmlType({ logger: createLogger() });

      const result = await sml.getSmlData('gone', {
        savedObjectsClient: savedObjectsClient as never,
        esClient: {} as never,
        logger: createLogger(),
      });

      expect(result).toBeUndefined();
    });

    it("warns and returns undefined when bulkGet throws (so the indexer doesn't loop on transient errors)", async () => {
      const savedObjectsClient = {
        bulkGet: jest.fn().mockRejectedValue(new Error('ES connection refused')),
      };
      const logger = createLogger();

      const sml = createMonitorSmlType({ logger: createLogger() });

      const result = await sml.getSmlData('config-1', {
        savedObjectsClient: savedObjectsClient as never,
        esClient: {} as never,
        logger,
      });

      expect(result).toBeUndefined();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("monitor_management sml.getSmlData: failed for 'config-1'")
      );
    });

    it('falls back to the origin id for the chunk title when the monitor has no name', async () => {
      const savedObjectsClient = {
        bulkGet: jest.fn().mockResolvedValue({
          saved_objects: [
            buildSavedObjectFound({
              id: 'config-untitled',
              type: syntheticsMonitorSavedObjectType,
              attributes: buildHttpMonitorAttributes({ [ConfigKey.NAME]: '' }),
            }),
            buildSavedObjectMissing({
              id: 'config-untitled',
              type: legacySyntheticsMonitorTypeSingle,
            }),
          ],
        }),
      };

      const sml = createMonitorSmlType({ logger: createLogger() });

      const result = await sml.getSmlData('config-untitled', {
        savedObjectsClient: savedObjectsClient as never,
        esClient: {} as never,
        logger: createLogger(),
      });

      expect(result?.chunks[0].title).toBe('config-untitled');
    });
  });

  describe('toAttachment', () => {
    it('wraps a found HTTP monitor as a MONITOR_MANAGEMENT_ATTACHMENT_TYPE attachment with origin set to the SO id', async () => {
      const savedObjectsClient = {
        bulkGet: jest.fn().mockResolvedValue({
          saved_objects: [
            buildSavedObjectFound({
              id: 'config-1',
              type: syntheticsMonitorSavedObjectType,
              attributes: buildHttpMonitorAttributes({
                [ConfigKey.CONFIG_ID]: 'config-1',
              }),
            }),
            buildSavedObjectMissing({
              id: 'config-1',
              type: legacySyntheticsMonitorTypeSingle,
            }),
          ],
        }),
      };

      const sml = createMonitorSmlType({ logger: createLogger() });

      const result = await sml.toAttachment(
        {
          id: 'sml-chunk-1',
          type: MONITOR_SML_TYPE,
          title: 'Elastic API health',
          origin_id: 'config-1',
          content: 'irrelevant for this test',
          created_at: '2026-04-30T17:00:00.000Z',
          updated_at: '2026-04-30T17:00:00.000Z',
          spaces: ['default'],
          permissions: ['saved_object:synthetics-monitor-multi-space/get'],
        },
        {
          request: {} as never,
          spaceId: 'default',
          savedObjectsClient: savedObjectsClient as never,
        }
      );

      expect(result).toEqual({
        type: MONITOR_MANAGEMENT_ATTACHMENT_TYPE,
        origin: 'config-1',
        data: expect.objectContaining({
          [ConfigKey.NAME]: 'Elastic API health',
          [ConfigKey.MONITOR_TYPE]: MonitorTypeEnum.HTTP,
          [ConfigKey.URLS]: 'https://api.elastic.co',
          [ConfigKey.CONFIG_ID]: 'config-1',
        }),
      });
    });

    it('uses the **request-scoped** soClient (no internal repo) — drives the auth-boundary contract', async () => {
      const requestScopedClient = {
        bulkGet: jest.fn().mockResolvedValue({
          saved_objects: [
            buildSavedObjectFound({
              id: 'config-1',
              type: syntheticsMonitorSavedObjectType,
            }),
            buildSavedObjectMissing({
              id: 'config-1',
              type: legacySyntheticsMonitorTypeSingle,
            }),
          ],
        }),
      };

      const sml = createMonitorSmlType({ logger: createLogger() });

      await sml.toAttachment(
        {
          id: 'sml-chunk-1',
          type: MONITOR_SML_TYPE,
          title: 'name',
          origin_id: 'config-1',
          content: '',
          created_at: '2026-04-30T17:00:00.000Z',
          updated_at: '2026-04-30T17:00:00.000Z',
          spaces: ['default'],
          permissions: ['saved_object:synthetics-monitor-multi-space/get'],
        },
        {
          request: {} as never,
          spaceId: 'default',
          savedObjectsClient: requestScopedClient as never,
        }
      );

      // The bulkGet must be invoked on the *passed* (request-scoped)
      // client — not via any module-level / internal repo. If this test
      // ever fails it usually means a refactor accidentally swapped to
      // `asInternalUser`, which would break the auth boundary.
      expect(requestScopedClient.bulkGet).toHaveBeenCalled();
    });

    it('returns undefined for non-HTTP monitors (v1 scope)', async () => {
      const savedObjectsClient = {
        bulkGet: jest.fn().mockResolvedValue({
          saved_objects: [
            buildSavedObjectFound({
              id: 'config-tcp',
              type: syntheticsMonitorSavedObjectType,
              attributes: buildHttpMonitorAttributes({
                [ConfigKey.MONITOR_TYPE]: MonitorTypeEnum.TCP,
              }),
            }),
            buildSavedObjectMissing({
              id: 'config-tcp',
              type: legacySyntheticsMonitorTypeSingle,
            }),
          ],
        }),
      };

      const sml = createMonitorSmlType({ logger: createLogger() });

      const result = await sml.toAttachment(
        {
          id: 'sml-chunk-tcp',
          type: MONITOR_SML_TYPE,
          title: 'TCP',
          origin_id: 'config-tcp',
          content: '',
          created_at: '2026-04-30T17:00:00.000Z',
          updated_at: '2026-04-30T17:00:00.000Z',
          spaces: ['default'],
          permissions: ['saved_object:synthetics-monitor-multi-space/get'],
        },
        {
          request: {} as never,
          spaceId: 'default',
          savedObjectsClient: savedObjectsClient as never,
        }
      );

      expect(result).toBeUndefined();
    });

    it('returns undefined when the monitor has been deleted', async () => {
      const savedObjectsClient = {
        bulkGet: jest.fn().mockResolvedValue({
          saved_objects: [
            buildSavedObjectMissing({
              id: 'gone',
              type: syntheticsMonitorSavedObjectType,
            }),
            buildSavedObjectMissing({
              id: 'gone',
              type: legacySyntheticsMonitorTypeSingle,
            }),
          ],
        }),
      };

      const sml = createMonitorSmlType({ logger: createLogger() });

      const result = await sml.toAttachment(
        {
          id: 'sml-chunk-gone',
          type: MONITOR_SML_TYPE,
          title: 'gone',
          origin_id: 'gone',
          content: '',
          created_at: '2026-04-30T17:00:00.000Z',
          updated_at: '2026-04-30T17:00:00.000Z',
          spaces: ['default'],
          permissions: ['saved_object:synthetics-monitor-multi-space/get'],
        },
        {
          request: {} as never,
          spaceId: 'default',
          savedObjectsClient: savedObjectsClient as never,
        }
      );

      expect(result).toBeUndefined();
    });
  });
});
