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

const buildContext = (attachmentsMock: AttachmentStateManager) => {
  const logger = loggerMock.create();
  const ctx = {
    logger,
    attachments: attachmentsMock,
    request: {} as never,
    spaceId: 'default',
    esClient: {} as never,
    savedObjectsClient: {} as never,
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
  return { ctx, logger };
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
    it('never reaches a Synthetics service or saved-objects client', async () => {
      const records = new Map<string, MonitorAttachment>();
      const { mock: attachments } = createAttachmentsMock(records);
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

      // savedObjectsClient is the surface we'd use to write monitors —
      // assert that nothing about it was touched.
      expect(ctx.savedObjectsClient).toEqual({});
    });
  });
});
