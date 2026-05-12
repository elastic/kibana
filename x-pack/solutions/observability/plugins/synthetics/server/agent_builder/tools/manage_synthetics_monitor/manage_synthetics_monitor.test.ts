/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type {
  AttachmentStateManager,
  AttachmentUpdateInput,
} from '@kbn/agent-builder-server/attachments';
import type { AttachmentInput, VersionedAttachment } from '@kbn/agent-builder-common/attachments';

import {
  MONITOR_MANAGEMENT_ATTACHMENT_TYPE,
  type MonitorAttachmentData,
} from '../../../../common/agent_builder';
import { ConfigKey } from '../../../../common/runtime_types';
import {
  MonitorTypeEnum,
  ScheduleUnit,
  SourceType,
} from '../../../../common/runtime_types/monitor_management/monitor_configs';
import { manageSyntheticsMonitorTool } from './manage_synthetics_monitor';
import type { MonitorOperation } from './operations';

type MonitorAttachment = VersionedAttachment<
  typeof MONITOR_MANAGEMENT_ATTACHMENT_TYPE,
  MonitorAttachmentData
>;

const buildSavedAttachmentData = (
  overrides: Partial<MonitorAttachmentData> = {}
): MonitorAttachmentData => ({
  [ConfigKey.NAME]: 'Existing monitor',
  [ConfigKey.MONITOR_TYPE]: MonitorTypeEnum.HTTP,
  [ConfigKey.ENABLED]: true,
  [ConfigKey.SCHEDULE]: { number: '5', unit: ScheduleUnit.MINUTES },
  [ConfigKey.LOCATIONS]: [{ id: 'us_central', label: 'US Central', isServiceManaged: true }],
  [ConfigKey.URLS]: 'https://existing.example.com',
  [ConfigKey.MONITOR_SOURCE_TYPE]: SourceType.UI,
  [ConfigKey.CONFIG_ID]: 'config-uuid',
  ...overrides,
});

const buildAttachmentRecord = (
  id: string,
  data: MonitorAttachmentData,
  origin?: string
): MonitorAttachment => ({
  id,
  type: MONITOR_MANAGEMENT_ATTACHMENT_TYPE,
  current_version: 1,
  versions: [
    {
      version: 1,
      data,
      created_at: new Date().toISOString(),
      content_hash: 'hash-1',
    },
  ],
  origin,
});

const createAttachmentsMock = (records: Map<string, MonitorAttachment>) => {
  const addedInputs: AttachmentInput[] = [];
  const updatedInputs: Array<{ id: string; input: AttachmentUpdateInput }> = [];

  const mock = {
    getAttachmentRecord: jest.fn((id: string) => records.get(id)),
    add: jest.fn(async (input: AttachmentInput) => {
      addedInputs.push(input);
      const record: MonitorAttachment = {
        id: input.id ?? 'generated-uuid',
        type: input.type as typeof MONITOR_MANAGEMENT_ATTACHMENT_TYPE,
        current_version: 1,
        versions: [
          {
            version: 1,
            data: input.data as MonitorAttachmentData,
            created_at: new Date().toISOString(),
            content_hash: 'new-hash',
          },
        ],
      };
      records.set(record.id, record);
      return record as VersionedAttachment;
    }),
    update: jest.fn(async (id: string, input: AttachmentUpdateInput) => {
      updatedInputs.push({ id, input });
      const existing = records.get(id);
      if (!existing) return undefined;
      const updated: MonitorAttachment = {
        ...existing,
        current_version: existing.current_version + 1,
        versions: [
          ...existing.versions,
          {
            version: existing.current_version + 1,
            data: (input.data ??
              existing.versions[existing.current_version - 1].data) as MonitorAttachmentData,
            created_at: new Date().toISOString(),
            content_hash: 'updated-hash',
          },
        ],
      };
      records.set(id, updated);
      return updated as VersionedAttachment;
    }),
  } as unknown as AttachmentStateManager & {
    add: jest.Mock;
    update: jest.Mock;
    getAttachmentRecord: jest.Mock;
  };

  return { mock, addedInputs, updatedInputs };
};

/**
 * Stub `savedObjectsClient` whose `bulkGet` always returns a not-found
 * response. Used by the bulk of the tests, which never trigger the
 * post-Create refresh path (because `attachmentRecord.origin` is
 * undefined or the in-memory data already has `config_id`). The Jest
 * `not.toHaveBeenCalled()` checks below ensure we don't silently start
 * relying on this stub returning anything meaningful.
 */
const buildSilentSavedObjectsClient = () => ({
  bulkGet: jest.fn(async () => ({ saved_objects: [] })),
});

const buildContext = (
  attachmentsMock: AttachmentStateManager,
  options: { savedObjectsClient?: { bulkGet: jest.Mock } } = {}
) => {
  const logger = loggerMock.create();
  const savedObjectsClient = options.savedObjectsClient ?? buildSilentSavedObjectsClient();
  const ctx = {
    logger,
    attachments: attachmentsMock,
    request: {} as never,
    spaceId: 'default',
    esClient: {} as never,
    savedObjectsClient: savedObjectsClient as never,
    modelProvider: {} as never,
    toolProvider: {} as never,
    runner: {} as never,
    resultStore: {} as never,
    events: {} as never,
    prompts: {} as never,
    stateManager: {} as never,
    filestore: {} as never,
    skills: {} as never,
    toolManager: {} as never,
    runContext: {} as never,
  };
  return { ctx, logger, savedObjectsClient };
};

describe('manageSyntheticsMonitorTool', () => {
  const tool = manageSyntheticsMonitorTool();

  it('exposes the expected id and schema', () => {
    expect(tool.id).toBe('manage_synthetics_monitor');
    expect(tool.schema).toBeDefined();
  });

  describe('proposed (new) monitor', () => {
    it('creates an attachment when monitor_attachment_id is omitted', async () => {
      const records = new Map<string, MonitorAttachment>();
      const { mock: attachments, addedInputs, updatedInputs } = createAttachmentsMock(records);
      const { ctx } = buildContext(attachments);

      const operations: MonitorOperation[] = [
        { operation: 'set_metadata', name: 'New monitor' },
        { operation: 'set_http_check', url: 'https://example.com' },
        { operation: 'set_schedule', number: '5', unit: ScheduleUnit.MINUTES },
        {
          operation: 'set_locations',
          locations: [{ id: 'us_central', isServiceManaged: true }],
        },
      ];

      const result = await tool.handler({ operations }, ctx);

      expect(attachments.add).toHaveBeenCalledTimes(1);
      expect(attachments.update).not.toHaveBeenCalled();
      expect(addedInputs[0].type).toBe(MONITOR_MANAGEMENT_ATTACHMENT_TYPE);
      expect(addedInputs[0].description).toContain('New monitor');
      expect(updatedInputs).toHaveLength(0);

      if (!('results' in result)) throw new Error('expected standard return');
      const [first] = result.results;
      expect(first.type).toBe(ToolResultType.other);
      const data = first.data as Record<string, unknown>;
      expect(data.status).toBe('proposed');
      // Brand-new draft → no `config_id` → lifecycle must be 'draft'
      // so the LLM picks the **Create** wording, not **Update**.
      expect(data.lifecycle).toBe('draft');
      expect(data.saveable).toBe(true);
      expect(data.missing_fields).toBeUndefined();
    });

    it('returns status=incomplete with missing fields when ops are insufficient', async () => {
      const records = new Map<string, MonitorAttachment>();
      const { mock: attachments } = createAttachmentsMock(records);
      const { ctx } = buildContext(attachments);

      const result = await tool.handler(
        { operations: [{ operation: 'set_metadata', name: 'Half-built' }] },
        ctx
      );

      if (!('results' in result)) throw new Error('expected standard return');
      const [first] = result.results;
      const data = first.data as Record<string, unknown>;
      expect(data.status).toBe('incomplete');
      expect(data.saveable).toBe(false);
      expect(data.missing_fields).toContain('url (set via set_http_check)');
    });
  });

  describe('updating an existing attachment', () => {
    it('updates instead of adding when monitor_attachment_id is provided', async () => {
      const records = new Map<string, MonitorAttachment>();
      records.set('mon-1', buildAttachmentRecord('mon-1', buildSavedAttachmentData()));
      const { mock: attachments, addedInputs, updatedInputs } = createAttachmentsMock(records);
      const { ctx } = buildContext(attachments);

      const result = await tool.handler(
        {
          monitor_attachment_id: 'mon-1',
          operations: [{ operation: 'set_enabled', enabled: false }],
        },
        ctx
      );

      expect(attachments.add).not.toHaveBeenCalled();
      expect(attachments.update).toHaveBeenCalledTimes(1);
      expect(addedInputs).toHaveLength(0);
      expect(updatedInputs[0].id).toBe('mon-1');

      const newData = updatedInputs[0].input.data as MonitorAttachmentData;
      expect(newData[ConfigKey.ENABLED]).toBe(false);

      if (!('results' in result)) throw new Error('expected standard return');
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.status).toBe('updated');
      // Existing attachment seeded with `config_id` (via
      // `buildSavedAttachmentData`) → lifecycle stays 'saved'
      // through the operation, so the LLM picks **Update**.
      expect(data.lifecycle).toBe('saved');
      expect(data.saveable).toBe(true);
    });

    it('returns an error result when the referenced attachment is missing', async () => {
      const { mock: attachments } = createAttachmentsMock(new Map());
      const { ctx, logger } = buildContext(attachments);

      const result = await tool.handler(
        {
          monitor_attachment_id: 'missing',
          operations: [{ operation: 'set_enabled', enabled: true }],
        },
        ctx
      );

      if (!('results' in result)) throw new Error('expected standard return');
      expect(result.results[0].type).toBe(ToolResultType.error);
      expect(logger.error).toHaveBeenCalled();
    });

    it('refuses to mutate a project-origin (CLI-managed) monitor', async () => {
      const records = new Map<string, MonitorAttachment>();
      records.set(
        'mon-cli',
        buildAttachmentRecord(
          'mon-cli',
          buildSavedAttachmentData({ [ConfigKey.MONITOR_SOURCE_TYPE]: SourceType.PROJECT })
        )
      );
      const { mock: attachments } = createAttachmentsMock(records);
      const { ctx } = buildContext(attachments);

      const result = await tool.handler(
        {
          monitor_attachment_id: 'mon-cli',
          operations: [{ operation: 'set_enabled', enabled: false }],
        },
        ctx
      );

      expect(attachments.update).not.toHaveBeenCalled();
      if (!('results' in result)) throw new Error('expected standard return');
      const [first] = result.results;
      expect(first.type).toBe(ToolResultType.other);
      const data = first.data as Record<string, unknown>;
      expect(data.error).toBe('cli_managed_monitor');
    });
  });

  describe('error handling', () => {
    it('returns a structured error result and warns on MonitorOperationValidationError', async () => {
      const { mock: attachments } = createAttachmentsMock(new Map());
      const { ctx, logger } = buildContext(attachments);

      const result = await tool.handler(
        {
          operations: [
            {
              operation: 'set_locations',
              locations: [
                { id: 'dup', isServiceManaged: true },
                { id: 'dup', isServiceManaged: true },
              ],
            },
          ],
        },
        ctx
      );

      if (!('results' in result)) throw new Error('expected standard return');
      const [first] = result.results;
      expect(first.type).toBe(ToolResultType.error);
      const data = first.data as { message: string; metadata?: Record<string, unknown> };
      expect(data.metadata?.code).toBe('duplicate_location');
      expect(logger.warn).toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
      expect(attachments.add).not.toHaveBeenCalled();
    });

    it('returns a structured error result and logs at error for unexpected failures', async () => {
      const records = new Map<string, MonitorAttachment>();
      records.set('boom', buildAttachmentRecord('boom', buildSavedAttachmentData()));
      const { mock: attachments } = createAttachmentsMock(records);
      attachments.update = jest
        .fn()
        .mockRejectedValueOnce(new Error('persist failed')) as typeof attachments.update;
      const { ctx, logger } = buildContext(attachments);

      const result = await tool.handler(
        {
          monitor_attachment_id: 'boom',
          operations: [{ operation: 'set_enabled', enabled: false }],
        },
        ctx
      );

      if (!('results' in result)) throw new Error('expected standard return');
      expect(result.results[0].type).toBe(ToolResultType.error);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('proposed → saved transition', () => {
    it("keeps origin: ui through ops; updateOrigin is the framework's job, not the tool's", async () => {
      const records = new Map<string, MonitorAttachment>();
      const { mock: attachments, addedInputs } = createAttachmentsMock(records);
      const { ctx } = buildContext(attachments);

      await tool.handler(
        {
          operations: [
            { operation: 'set_metadata', name: 'New' },
            { operation: 'set_http_check', url: 'https://example.com' },
            { operation: 'set_schedule', number: '5', unit: ScheduleUnit.MINUTES },
            {
              operation: 'set_locations',
              locations: [{ id: 'us_central', isServiceManaged: true }],
            },
          ],
        },
        ctx
      );

      const data = addedInputs[0].data as MonitorAttachmentData;
      // Stub seeds origin: ui — the tool never marks anything `project`,
      // and never assigns a config_id (that's the CRUD endpoint's job).
      expect(data[ConfigKey.MONITOR_SOURCE_TYPE]).toBe(SourceType.UI);
      expect(data[ConfigKey.CONFIG_ID]).toBeUndefined();
    });
  });

  describe('no-persistence guarantee', () => {
    it('never reaches the saved-objects client when composing a fresh draft (no monitor_attachment_id)', async () => {
      const records = new Map<string, MonitorAttachment>();
      const { mock: attachments } = createAttachmentsMock(records);
      const { ctx, savedObjectsClient } = buildContext(attachments);

      await tool.handler(
        {
          operations: [
            { operation: 'set_metadata', name: 'New' },
            { operation: 'set_http_check', url: 'https://example.com' },
            { operation: 'set_schedule', number: '5', unit: ScheduleUnit.MINUTES },
            {
              operation: 'set_locations',
              locations: [{ id: 'us_central', isServiceManaged: true }],
            },
          ],
        },
        ctx
      );

      // The "no SO refresh" guarantee for the new-draft path: we only
      // touch the saved-objects client when re-resolving an attachment
      // that already has an `origin` and lacks `config_id` (the
      // post-Create refresh in `resolveMonitorAttachmentData`). For a
      // fresh draft neither precondition holds, so `bulkGet` must
      // remain untouched.
      expect(savedObjectsClient.bulkGet).not.toHaveBeenCalled();
    });
  });

  describe('refresh after Save (origin set, in-memory data missing config_id)', () => {
    /**
     * Reproduces the post-Create UX bug: the framework's `updateOrigin`
     * sets `attachment.origin` after a successful Save, but never
     * re-resolves the in-memory data. The next tool call would then
     * read a snapshot with no `config_id` and the canvas would keep
     * showing **Create** instead of **Update** for what is in fact a
     * saved monitor. The fix re-fetches the live SO and overlays the
     * fresh data before applying operations, so the round-tripped
     * attachment again carries `config_id`.
     */
    const buildSavedMonitorSO = (
      configId: string,
      overrides: Partial<MonitorAttachmentData> = {}
    ) => ({
      type: 'synthetics-monitor-multi-space',
      id: configId,
      attributes: buildSavedAttachmentData({
        [ConfigKey.CONFIG_ID]: configId,
        ...overrides,
      }),
      updated_at: '2026-05-02T20:00:00.000Z',
      created_at: '2026-05-02T19:00:00.000Z',
    });

    it("refreshes data from the SO when origin is set but the in-memory snapshot has no config_id, so the next save round-trips as 'updated'", async () => {
      const records = new Map<string, MonitorAttachment>();
      // Stale snapshot — what `attachmentStateManager` holds right
      // after `updateOrigin('config-uuid')`: the data the agent
      // composed pre-Save (no `config_id`), with the new origin
      // grafted on by the framework.
      const staleData = buildSavedAttachmentData({
        [ConfigKey.NAME]: 'Last monitor',
      });
      delete staleData[ConfigKey.CONFIG_ID];
      records.set('mon-1', buildAttachmentRecord('mon-1', staleData, 'config-uuid'));
      const { mock: attachments, updatedInputs } = createAttachmentsMock(records);

      // SO bulkGet returns the saved monitor with `config_id` populated
      // — `fetchMonitorAttachmentData` returns the first SO that has
      // attributes (the legacy SO type entry is null in this scenario).
      const bulkGet = jest.fn(async () => ({
        saved_objects: [
          buildSavedMonitorSO('config-uuid', { [ConfigKey.NAME]: 'Last monitor' }),
          null,
        ],
      }));
      const { ctx } = buildContext(attachments, {
        savedObjectsClient: { bulkGet } as { bulkGet: jest.Mock },
      });

      const result = await tool.handler(
        {
          monitor_attachment_id: 'mon-1',
          operations: [
            {
              operation: 'set_locations',
              locations: [{ id: 'eu_west', label: 'EU West', isServiceManaged: true }],
            },
          ],
        },
        ctx
      );

      // Refresh hit the SO once with both type variants — same call
      // shape as the attachment type's `resolve` hook.
      expect(bulkGet).toHaveBeenCalledTimes(1);

      // The persisted attachment now carries `config_id`, so the
      // canvas's `inferMonitorStatus` will resolve to `'enabled'`
      // and render the **Update** button instead of **Create**.
      const newData = updatedInputs[0].input.data as MonitorAttachmentData;
      expect(newData[ConfigKey.CONFIG_ID]).toBe('config-uuid');
      // Operation still applied on top of the refreshed snapshot.
      expect(newData[ConfigKey.LOCATIONS]).toEqual([
        { id: 'eu_west', label: 'EU West', isServiceManaged: true },
      ]);

      if (!('results' in result)) throw new Error('expected standard return');
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.status).toBe('updated');
      // Lifecycle reports the **monitor's** state, not the tool
      // action's: refresh resolved a `config_id`, so the LLM should
      // see `lifecycle: 'saved'` and tell the user to click
      // **Update** (not **Create**) — this is the precise signal that
      // was missing in the original "Update button still says Create"
      // bug report.
      expect(data.lifecycle).toBe('saved');
      expect(data.monitor).toMatchObject({ config_id: 'config-uuid' });
    });

    it('does NOT refresh when origin is unset (proposed draft path stays SO-free)', async () => {
      const records = new Map<string, MonitorAttachment>();
      const staleData = buildSavedAttachmentData();
      delete staleData[ConfigKey.CONFIG_ID];
      // No origin — this is the proposed-draft path.
      records.set('mon-1', buildAttachmentRecord('mon-1', staleData));
      const { mock: attachments } = createAttachmentsMock(records);
      const { ctx, savedObjectsClient } = buildContext(attachments);

      await tool.handler(
        {
          monitor_attachment_id: 'mon-1',
          operations: [{ operation: 'set_enabled', enabled: false }],
        },
        ctx
      );

      expect(savedObjectsClient.bulkGet).not.toHaveBeenCalled();
    });

    it("reports lifecycle='draft' when updating a never-saved draft (status='updated' alone is NOT enough to claim 'Update' wording)", async () => {
      // Reproduces the "Click Update — but the canvas still shows
      // Create" symptom we hit in field testing. The agent passed
      // `monitor_attachment_id` for an existing **draft** attachment
      // (no origin, no config_id). The tool correctly returns
      // `status: 'updated'` (we did mutate an existing record), but
      // the canvas's `inferMonitorStatus` ignores `status` — it keys
      // off `config_id`. The new `lifecycle` field collapses both
      // signals into one for the LLM.
      const records = new Map<string, MonitorAttachment>();
      const draftData = buildSavedAttachmentData();
      delete draftData[ConfigKey.CONFIG_ID];
      records.set('mon-draft', buildAttachmentRecord('mon-draft', draftData));
      const { mock: attachments, updatedInputs } = createAttachmentsMock(records);
      const { ctx } = buildContext(attachments);

      const result = await tool.handler(
        {
          monitor_attachment_id: 'mon-draft',
          operations: [
            {
              operation: 'set_locations',
              locations: [{ id: 'eu_west', label: 'EU West', isServiceManaged: true }],
            },
          ],
        },
        ctx
      );

      const newData = updatedInputs[0].input.data as MonitorAttachmentData;
      expect(newData[ConfigKey.CONFIG_ID]).toBeUndefined();

      if (!('results' in result)) throw new Error('expected standard return');
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.status).toBe('updated');
      // The contract that matters for the user: lifecycle === 'draft'
      // tells the LLM to point at **Create** (matching what the
      // canvas will actually render), not **Update**.
      expect(data.lifecycle).toBe('draft');
    });

    it('does NOT refresh when the in-memory snapshot already has config_id (steady state)', async () => {
      const records = new Map<string, MonitorAttachment>();
      // Already-fresh snapshot — buildSavedAttachmentData seeds CONFIG_ID.
      records.set(
        'mon-1',
        buildAttachmentRecord('mon-1', buildSavedAttachmentData(), 'config-uuid')
      );
      const { mock: attachments } = createAttachmentsMock(records);
      const { ctx, savedObjectsClient } = buildContext(attachments);

      await tool.handler(
        {
          monitor_attachment_id: 'mon-1',
          operations: [{ operation: 'set_enabled', enabled: false }],
        },
        ctx
      );

      expect(savedObjectsClient.bulkGet).not.toHaveBeenCalled();
    });

    it('falls back to the in-memory snapshot and warns when the SO refresh returns nothing (deleted out-of-band)', async () => {
      const records = new Map<string, MonitorAttachment>();
      const staleData = buildSavedAttachmentData();
      delete staleData[ConfigKey.CONFIG_ID];
      records.set('mon-1', buildAttachmentRecord('mon-1', staleData, 'gone-uuid'));
      const { mock: attachments, updatedInputs } = createAttachmentsMock(records);

      // Both SO type variants come back as null — `fetchMonitorAttachmentData`
      // logs a warn and returns `undefined`, which our resolver then
      // also warns on before falling back to the in-memory data.
      const bulkGet = jest.fn(async () => ({ saved_objects: [null, null] }));
      const { ctx, logger } = buildContext(attachments, {
        savedObjectsClient: { bulkGet } as { bulkGet: jest.Mock },
      });

      await tool.handler(
        {
          monitor_attachment_id: 'mon-1',
          operations: [{ operation: 'set_enabled', enabled: false }],
        },
        ctx
      );

      expect(bulkGet).toHaveBeenCalledTimes(1);
      const newData = updatedInputs[0].input.data as MonitorAttachmentData;
      // Still no config_id — operations applied to the stale snapshot.
      expect(newData[ConfigKey.CONFIG_ID]).toBeUndefined();
      expect(newData[ConfigKey.ENABLED]).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringMatching(/manage_synthetics_monitor\.refresh: miss attachment='mon-1'/)
      );
    });
  });
});
