/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type {
  AttachmentResolveContext,
  AttachmentTypeDefinition,
} from '@kbn/agent-builder-server/attachments';
import type {
  Attachment,
  VersionedAttachmentWithOrigin,
} from '@kbn/agent-builder-common/attachments';
import {
  legacySyntheticsMonitorTypeSingle,
  syntheticsMonitorSavedObjectType,
} from '../../../common/types/saved_objects';
import {
  MONITOR_MANAGEMENT_ATTACHMENT_TYPE,
  type MonitorAttachmentData,
} from '../../../common/agent_builder';
import { ConfigKey } from '../../../common/runtime_types';
import {
  MonitorTypeEnum,
  ScheduleUnit,
  SourceType,
} from '../../../common/runtime_types/monitor_management/monitor_configs';
import { createMonitorManagementAttachmentType } from './monitor_management_attachment_type';

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
  [ConfigKey.TAGS]: ['poc', 'public-api'],
  [ConfigKey.NAMESPACE]: 'default',
  [ConfigKey.MAX_ATTEMPTS]: 1,
  [ConfigKey.APM_SERVICE_NAME]: '',
  [ConfigKey.CONFIG_ID]: 'config-1',
  [ConfigKey.MONITOR_QUERY_ID]: 'config-1',
  ...overrides,
});

const buildSavedObjectFound = ({
  id,
  type,
  attributes = buildHttpMonitorAttributes(),
  updatedAt = '2026-04-30T17:00:00.000Z',
}: {
  id: string;
  type: string;
  attributes?: Record<string, unknown>;
  updatedAt?: string;
}) => ({
  id,
  type,
  attributes,
  namespaces: ['default'],
  updated_at: updatedAt,
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

const buildAttachmentData = (
  overrides: Partial<MonitorAttachmentData> = {}
): MonitorAttachmentData => ({
  [ConfigKey.NAME]: 'Elastic API health',
  [ConfigKey.MONITOR_TYPE]: MonitorTypeEnum.HTTP,
  [ConfigKey.ENABLED]: true,
  [ConfigKey.SCHEDULE]: { number: '5', unit: ScheduleUnit.MINUTES },
  [ConfigKey.LOCATIONS]: [
    { id: 'us_central', label: 'North America - US Central', isServiceManaged: true },
  ],
  [ConfigKey.URLS]: 'https://api.elastic.co',
  ...overrides,
});

const buildResolveContext = ({
  savedObjectsClient,
  spaceId = 'default',
}: {
  savedObjectsClient?: unknown;
  spaceId?: string;
} = {}): AttachmentResolveContext => ({
  request: {} as never,
  spaceId,
  savedObjectsClient: savedObjectsClient as never,
});

describe('createMonitorManagementAttachmentType', () => {
  const buildAttachmentType = (): AttachmentTypeDefinition<
    typeof MONITOR_MANAGEMENT_ATTACHMENT_TYPE,
    MonitorAttachmentData
  > => createMonitorManagementAttachmentType({ logger: createLogger() });

  it('exposes the agreed attachment type id and is not read-only', () => {
    const def = buildAttachmentType();
    expect(def.id).toBe(MONITOR_MANAGEMENT_ATTACHMENT_TYPE);
    expect(def.isReadonly).toBe(false);
  });

  describe('validate', () => {
    it('accepts a valid HTTP monitor (proposed)', async () => {
      const def = buildAttachmentType();
      const result = await Promise.resolve(def.validate(buildAttachmentData()));
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data[ConfigKey.NAME]).toBe('Elastic API health');
      }
    });

    it('rejects malformed input with an error message', async () => {
      const def = buildAttachmentType();
      const result = await Promise.resolve(def.validate({ junk: true }));
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(typeof result.error).toBe('string');
        expect(result.error.length).toBeGreaterThan(0);
      }
    });
  });

  describe('resolve', () => {
    it('returns projected attachment data for an HTTP monitor scoped to the user', async () => {
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

      const def = buildAttachmentType();
      const data = await def.resolve!('config-1', buildResolveContext({ savedObjectsClient }));

      expect(savedObjectsClient.bulkGet).toHaveBeenCalledWith([
        { type: syntheticsMonitorSavedObjectType, id: 'config-1' },
        { type: legacySyntheticsMonitorTypeSingle, id: 'config-1' },
      ]);
      expect(data?.[ConfigKey.NAME]).toBe('Elastic API health');
      expect(data?.[ConfigKey.URLS]).toBe('https://api.elastic.co');
      expect(data?.[ConfigKey.CONFIG_ID]).toBe('config-1');
    });

    it('resolves a project-origin (CLI-managed) monitor without throwing', async () => {
      const savedObjectsClient = {
        bulkGet: jest.fn().mockResolvedValue({
          saved_objects: [
            buildSavedObjectFound({
              id: 'project-config-1',
              type: syntheticsMonitorSavedObjectType,
              attributes: buildHttpMonitorAttributes({
                [ConfigKey.MONITOR_SOURCE_TYPE]: SourceType.PROJECT,
                [ConfigKey.PROJECT_ID]: 'my-project',
              }),
            }),
            buildSavedObjectMissing({
              id: 'project-config-1',
              type: legacySyntheticsMonitorTypeSingle,
            }),
          ],
        }),
      };

      const def = buildAttachmentType();
      const data = await def.resolve!(
        'project-config-1',
        buildResolveContext({ savedObjectsClient })
      );

      // Project-origin monitors must still resolve — the canvas needs the
      // data to render the "Edit via CLI" read-only state. Save buttons are
      // gated client-side, not by resolve refusal.
      expect(data?.[ConfigKey.MONITOR_SOURCE_TYPE]).toBe(SourceType.PROJECT);
    });

    it('logs warn and returns undefined when no SO matches the origin', async () => {
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
      const logger = createLogger();
      const def = createMonitorManagementAttachmentType({ logger });

      const data = await def.resolve!('gone', buildResolveContext({ savedObjectsClient }));

      expect(data).toBeUndefined();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          "monitor_management attachment.resolve: no monitor found for config_id='gone'"
        )
      );
    });

    it('logs warn and returns undefined for non-HTTP monitors (v1 scope)', async () => {
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
      const def = buildAttachmentType();
      const data = await def.resolve!('config-tcp', buildResolveContext({ savedObjectsClient }));
      expect(data).toBeUndefined();
    });

    it('logs warn and returns undefined when savedObjectsClient is missing from the context', async () => {
      const logger = createLogger();
      const def = createMonitorManagementAttachmentType({ logger });

      const data = await def.resolve!(
        'config-1',
        buildResolveContext({ savedObjectsClient: undefined })
      );

      expect(data).toBeUndefined();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          "monitor_management attachment.resolve: missing savedObjectsClient on context for origin 'config-1'"
        )
      );
    });
  });

  describe('isStale', () => {
    const buildVersionedAttachment = ({
      origin = 'config-1',
      origin_snapshot_at = '2026-04-30T16:00:00.000Z',
    }: {
      origin?: string;
      origin_snapshot_at?: string;
    } = {}): VersionedAttachmentWithOrigin<
      typeof MONITOR_MANAGEMENT_ATTACHMENT_TYPE,
      MonitorAttachmentData
    > => ({
      id: 'attachment-1',
      type: MONITOR_MANAGEMENT_ATTACHMENT_TYPE,
      versions: [
        {
          version: 1,
          data: buildAttachmentData(),
          created_at: origin_snapshot_at,
          content_hash: 'abc',
        },
      ],
      current_version: 1,
      origin,
      origin_snapshot_at,
    });

    it('returns true when the live monitor is newer than the snapshot', async () => {
      const savedObjectsClient = {
        bulkGet: jest.fn().mockResolvedValue({
          saved_objects: [
            buildSavedObjectFound({
              id: 'config-1',
              type: syntheticsMonitorSavedObjectType,
              updatedAt: '2026-04-30T18:00:00.000Z',
            }),
            buildSavedObjectMissing({
              id: 'config-1',
              type: legacySyntheticsMonitorTypeSingle,
            }),
          ],
        }),
      };

      const def = buildAttachmentType();
      const stale = await def.isStale!(
        buildVersionedAttachment({ origin_snapshot_at: '2026-04-30T16:00:00.000Z' }),
        buildResolveContext({ savedObjectsClient })
      );

      expect(stale).toBe(true);
    });

    it('returns false when the live monitor is the same age or older than the snapshot', async () => {
      const savedObjectsClient = {
        bulkGet: jest.fn().mockResolvedValue({
          saved_objects: [
            buildSavedObjectFound({
              id: 'config-1',
              type: syntheticsMonitorSavedObjectType,
              updatedAt: '2026-04-30T16:00:00.000Z',
            }),
            buildSavedObjectMissing({
              id: 'config-1',
              type: legacySyntheticsMonitorTypeSingle,
            }),
          ],
        }),
      };

      const def = buildAttachmentType();
      const stale = await def.isStale!(
        buildVersionedAttachment({ origin_snapshot_at: '2026-04-30T16:00:00.000Z' }),
        buildResolveContext({ savedObjectsClient })
      );

      expect(stale).toBe(false);
    });

    it('returns false when origin_snapshot_at is missing (no anchor)', async () => {
      const def = buildAttachmentType();
      const stale = await def.isStale!(
        {
          ...buildVersionedAttachment(),
          origin_snapshot_at: undefined,
        } as never,
        buildResolveContext({ savedObjectsClient: { bulkGet: jest.fn() } })
      );
      expect(stale).toBe(false);
    });

    it('warns and returns false when the live monitor has no updated_at', async () => {
      // Build a SO **without** an `updated_at` field (mirrors a partially
      // migrated fixture). JS destructure defaults coalesce an explicit
      // `undefined`, so we drop the key entirely instead.
      const savedObjectWithoutUpdatedAt = {
        ...buildSavedObjectFound({
          id: 'config-1',
          type: syntheticsMonitorSavedObjectType,
        }),
      };
      delete (savedObjectWithoutUpdatedAt as { updated_at?: string }).updated_at;

      const savedObjectsClient = {
        bulkGet: jest.fn().mockResolvedValue({
          saved_objects: [
            savedObjectWithoutUpdatedAt,
            buildSavedObjectMissing({
              id: 'config-1',
              type: legacySyntheticsMonitorTypeSingle,
            }),
          ],
        }),
      };
      const logger = createLogger();
      const def = createMonitorManagementAttachmentType({ logger });

      const stale = await def.isStale!(
        buildVersionedAttachment(),
        buildResolveContext({ savedObjectsClient })
      );

      expect(stale).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'monitor_management attachment.isStale: no updated_at on live monitor'
        )
      );
    });

    it('warns and returns false when bulkGet throws', async () => {
      const savedObjectsClient = {
        bulkGet: jest.fn().mockRejectedValue(new Error('ES connection refused')),
      };
      const logger = createLogger();
      const def = createMonitorManagementAttachmentType({ logger });

      const stale = await def.isStale!(
        buildVersionedAttachment(),
        buildResolveContext({ savedObjectsClient })
      );

      expect(stale).toBe(false);
      // Either the inner fetch helper warning OR the outer try/catch
      // warning satisfies this — both are "warn, not error" by design.
      expect(logger.warn).toHaveBeenCalled();
    });

    it('warns and returns false when savedObjectsClient is missing from the context', async () => {
      const logger = createLogger();
      const def = createMonitorManagementAttachmentType({ logger });

      const stale = await def.isStale!(
        buildVersionedAttachment(),
        buildResolveContext({ savedObjectsClient: undefined })
      );

      expect(stale).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'monitor_management attachment.isStale: missing savedObjectsClient on context'
        )
      );
    });
  });

  describe('format.getRepresentation', () => {
    const buildAttachment = (
      data: MonitorAttachmentData
    ): Attachment<typeof MONITOR_MANAGEMENT_ATTACHMENT_TYPE, MonitorAttachmentData> => ({
      id: 'attachment-1',
      type: MONITOR_MANAGEMENT_ATTACHMENT_TYPE,
      data,
    });

    // `format()` returns `MaybePromise<AgentFormattedAttachment>`. We
    // unwrap once per test via `Promise.resolve` so each block stays
    // async and the assertions read top-down.
    const renderText = async (
      def: AttachmentTypeDefinition<
        typeof MONITOR_MANAGEMENT_ATTACHMENT_TYPE,
        MonitorAttachmentData
      >,
      data: MonitorAttachmentData
    ): Promise<string> => {
      const formatted = await Promise.resolve(
        def.format(buildAttachment(data), { request: {} as never, spaceId: 'default' })
      );
      const rep = await Promise.resolve(formatted.getRepresentation!());
      if (rep.type !== 'text') {
        throw new Error(`Expected text representation, got ${rep.type}`);
      }
      return rep.value;
    };

    it('renders status="proposed" when there is no config_id', async () => {
      const value = await renderText(buildAttachmentType(), buildAttachmentData());
      expect(value).toContain('status: proposed');
      expect(value).toContain('Elastic API health');
      expect(value).toContain('attachment-1');
    });

    it('renders status="enabled" for a saved enabled monitor', async () => {
      const value = await renderText(
        buildAttachmentType(),
        buildAttachmentData({
          [ConfigKey.CONFIG_ID]: 'config-1',
          [ConfigKey.ENABLED]: true,
        })
      );
      expect(value).toContain('status: enabled');
    });

    it('renders status="disabled" for a saved disabled monitor', async () => {
      const value = await renderText(
        buildAttachmentType(),
        buildAttachmentData({
          [ConfigKey.CONFIG_ID]: 'config-1',
          [ConfigKey.ENABLED]: false,
        })
      );
      expect(value).toContain('status: disabled');
    });

    it('renders status="cli-managed" for a project-origin monitor (regardless of enabled)', async () => {
      const value = await renderText(
        buildAttachmentType(),
        buildAttachmentData({
          [ConfigKey.CONFIG_ID]: 'project-config-1',
          [ConfigKey.MONITOR_SOURCE_TYPE]: SourceType.PROJECT,
          [ConfigKey.ENABLED]: true,
        })
      );
      expect(value).toContain('status: cli-managed');
    });

    it('does not leak any value that looks like a secret (defense check)', async () => {
      // Pretend the data carries fields that snuck through. The
      // representation only references the schema-known keys, so neither
      // value nor any structure-leaking key must appear.
      const dataWithLeakedSecret = {
        ...buildAttachmentData(),
        password: 'super-secret-pa$$w0rd',
        params: '{"hidden":true}',
      } as unknown as MonitorAttachmentData;
      const value = await renderText(buildAttachmentType(), dataWithLeakedSecret);
      expect(value).not.toContain('super-secret-pa$$w0rd');
      expect(value).not.toContain('hidden');
    });

    it('renders schedule, locations count, and tags', async () => {
      const value = await renderText(
        buildAttachmentType(),
        buildAttachmentData({
          [ConfigKey.SCHEDULE]: { number: '10', unit: ScheduleUnit.MINUTES },
          [ConfigKey.LOCATIONS]: [
            { id: 'a', label: 'A', isServiceManaged: true },
            { id: 'b', label: 'B', isServiceManaged: false, agentPolicyId: 'fleet-1' },
          ],
          [ConfigKey.TAGS]: ['poc', 'prod'],
        })
      );
      expect(value).toContain('Schedule: every 10m');
      expect(value).toContain('Locations: 2');
      expect(value).toContain('Tags: poc, prod');
    });
  });

  describe('getAgentDescription', () => {
    it('points to the real skill and tool — no fictitious tool names', () => {
      const def = buildAttachmentType();
      const description = def.getAgentDescription!();
      expect(description).toContain('monitor-management');
      expect(description).toContain('manage_synthetics_monitor');
      // Sanity check: no obviously fake names from prior drafts of the doc
      expect(description).not.toContain('manage_monitor');
      expect(description).not.toContain('synthetics_monitor_tool');
    });
  });
});
