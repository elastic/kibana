/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { ConfigKey } from '../../../../common/runtime_types';
import {
  MonitorTypeEnum,
  ScheduleUnit,
  SourceType,
} from '../../../../common/runtime_types/monitor_management/monitor_configs';
import type { MonitorAttachmentData } from '../../../../common/agent_builder';
import {
  MonitorOperationValidationError,
  assertMonitorDraftSaveable,
  buildEmptyMonitorDraft,
  executeMonitorOperations,
} from './monitor_draft';
import type { MonitorOperation } from './operations';

const buildSavedDraft = (
  overrides: Partial<MonitorAttachmentData> = {}
): MonitorAttachmentData => ({
  [ConfigKey.NAME]: 'Saved monitor',
  [ConfigKey.MONITOR_TYPE]: MonitorTypeEnum.HTTP,
  [ConfigKey.ENABLED]: true,
  [ConfigKey.SCHEDULE]: { number: '5', unit: ScheduleUnit.MINUTES },
  [ConfigKey.LOCATIONS]: [{ id: 'us_central', label: 'US Central', isServiceManaged: true }],
  [ConfigKey.URLS]: 'https://example.com',
  [ConfigKey.MONITOR_SOURCE_TYPE]: SourceType.UI,
  ...overrides,
});

describe('buildEmptyMonitorDraft', () => {
  it('seeds only structural keys; required user-supplied fields are absent', () => {
    const draft = buildEmptyMonitorDraft();
    expect(draft[ConfigKey.MONITOR_TYPE]).toBe(MonitorTypeEnum.HTTP);
    expect(draft[ConfigKey.MONITOR_SOURCE_TYPE]).toBe(SourceType.UI);
    expect(draft[ConfigKey.ENABLED]).toBe(true);
    expect(draft[ConfigKey.NAME]).toBeUndefined();
    expect(draft[ConfigKey.URLS]).toBeUndefined();
    expect(draft[ConfigKey.SCHEDULE]).toBeUndefined();
    expect(draft[ConfigKey.LOCATIONS]).toBeUndefined();
  });
});

describe('executeMonitorOperations', () => {
  const logger = loggerMock.create();

  beforeEach(() => {
    loggerMock.clear(logger);
  });

  describe('set_metadata', () => {
    it('writes name, tags, apm_service_name, namespace into the draft', () => {
      const draft = executeMonitorOperations({
        currentDraft: undefined,
        operations: [
          {
            operation: 'set_metadata',
            name: 'My monitor',
            tags: ['prod'],
            apm_service_name: 'svc',
            namespace: 'foo',
          },
        ],
        logger,
      });
      expect(draft[ConfigKey.NAME]).toBe('My monitor');
      expect(draft[ConfigKey.TAGS]).toEqual(['prod']);
      expect(draft[ConfigKey.APM_SERVICE_NAME]).toBe('svc');
      expect(draft[ConfigKey.NAMESPACE]).toBe('foo');
    });

    it('skips an empty set_metadata op (debug-logs and no-ops)', () => {
      const draft = executeMonitorOperations({
        currentDraft: undefined,
        operations: [{ operation: 'set_metadata' }],
        logger,
      });
      expect(draft[ConfigKey.NAME]).toBeUndefined();
      expect(logger.debug).toHaveBeenCalledWith('Skipping empty set_metadata operation');
    });
  });

  describe('set_schedule', () => {
    it('writes schedule', () => {
      const draft = executeMonitorOperations({
        currentDraft: undefined,
        operations: [{ operation: 'set_schedule', number: '5', unit: ScheduleUnit.MINUTES }],
        logger,
      });
      expect(draft[ConfigKey.SCHEDULE]).toEqual({ number: '5', unit: ScheduleUnit.MINUTES });
    });
  });

  describe('set_http_check', () => {
    it('writes url and optional advanced fields', () => {
      const draft = executeMonitorOperations({
        currentDraft: undefined,
        operations: [
          {
            operation: 'set_http_check',
            url: 'https://example.com',
            method: 'POST',
            max_redirects: 3,
            ignore_https_errors: true,
          },
        ],
        logger,
      });
      expect(draft[ConfigKey.URLS]).toBe('https://example.com');
      expect(draft[ConfigKey.REQUEST_METHOD_CHECK]).toBe('POST');
      expect(draft[ConfigKey.MAX_REDIRECTS]).toBe(3);
      expect(draft[ConfigKey.IGNORE_HTTPS_ERRORS]).toBe(true);
    });

    it('does not overwrite advanced fields with undefined', () => {
      const draft = executeMonitorOperations({
        currentDraft: buildSavedDraft({
          [ConfigKey.REQUEST_METHOD_CHECK]: 'GET',
        }),
        operations: [{ operation: 'set_http_check', url: 'https://example.com/v2' }],
        logger,
      });
      expect(draft[ConfigKey.URLS]).toBe('https://example.com/v2');
      expect(draft[ConfigKey.REQUEST_METHOD_CHECK]).toBe('GET');
    });
  });

  describe('set_locations', () => {
    it('replaces locations and preserves agentPolicyId for private locations', () => {
      const draft = executeMonitorOperations({
        currentDraft: undefined,
        operations: [
          {
            operation: 'set_locations',
            locations: [
              { id: 'us_central', isServiceManaged: true },
              {
                id: 'pl-uuid',
                isServiceManaged: false,
                agentPolicyId: 'agent-policy-uuid',
              },
            ],
          },
        ],
        logger,
      });
      expect(draft[ConfigKey.LOCATIONS]).toHaveLength(2);
      expect(draft[ConfigKey.LOCATIONS]?.[0]).toEqual({
        id: 'us_central',
        isServiceManaged: true,
      });
      expect(draft[ConfigKey.LOCATIONS]?.[1]).toEqual({
        id: 'pl-uuid',
        isServiceManaged: false,
        agentPolicyId: 'agent-policy-uuid',
      });
    });

    it('throws MonitorOperationValidationError on duplicate location ids', () => {
      expect(() =>
        executeMonitorOperations({
          currentDraft: undefined,
          operations: [
            {
              operation: 'set_locations',
              locations: [
                { id: 'us_central', isServiceManaged: true },
                { id: 'us_central', isServiceManaged: true },
              ],
            },
          ],
          logger,
        })
      ).toThrow(MonitorOperationValidationError);
    });
  });

  describe('set_enabled', () => {
    it('toggles enabled', () => {
      const draft = executeMonitorOperations({
        currentDraft: buildSavedDraft({ [ConfigKey.ENABLED]: true }),
        operations: [{ operation: 'set_enabled', enabled: false }],
        logger,
      });
      expect(draft[ConfigKey.ENABLED]).toBe(false);
    });
  });

  it('applies multiple operations in order', () => {
    const operations: MonitorOperation[] = [
      { operation: 'set_metadata', name: 'New monitor' },
      { operation: 'set_http_check', url: 'https://example.com' },
      { operation: 'set_schedule', number: '3', unit: ScheduleUnit.MINUTES },
      {
        operation: 'set_locations',
        locations: [{ id: 'us_central', isServiceManaged: true }],
      },
    ];
    const draft = executeMonitorOperations({ currentDraft: undefined, operations, logger });
    expect(draft[ConfigKey.NAME]).toBe('New monitor');
    expect(draft[ConfigKey.URLS]).toBe('https://example.com');
    expect(draft[ConfigKey.SCHEDULE]).toEqual({ number: '3', unit: ScheduleUnit.MINUTES });
    expect(draft[ConfigKey.LOCATIONS]).toHaveLength(1);
  });

  it('does not mutate the input currentDraft', () => {
    const original = buildSavedDraft();
    const snapshotName = original[ConfigKey.NAME];
    executeMonitorOperations({
      currentDraft: original,
      operations: [{ operation: 'set_metadata', name: 'Renamed' }],
      logger,
    });
    expect(original[ConfigKey.NAME]).toBe(snapshotName);
  });
});

describe('assertMonitorDraftSaveable', () => {
  it('returns saveable=true with attachment data when all required keys are present', () => {
    const result = assertMonitorDraftSaveable(buildSavedDraft());
    expect(result.saveable).toBe(true);
    if (result.saveable) {
      expect(result.data[ConfigKey.NAME]).toBe('Saved monitor');
    }
  });

  it('lists missing fields in the deterministic order: name, url, schedule, locations', () => {
    const result = assertMonitorDraftSaveable(buildEmptyMonitorDraft());
    expect(result.saveable).toBe(false);
    if (!result.saveable) {
      expect(result.missing).toEqual([
        'name',
        'url (set via set_http_check)',
        'schedule (set via set_schedule)',
        'locations (set via set_locations)',
      ]);
    }
  });

  it('rejects an off-allow-list minutes schedule', () => {
    const result = assertMonitorDraftSaveable(
      buildSavedDraft({ [ConfigKey.SCHEDULE]: { number: '7', unit: ScheduleUnit.MINUTES } })
    );
    expect(result.saveable).toBe(false);
    if (!result.saveable) {
      expect(result.missing).toEqual(['schedule']);
    }
  });

  it('accepts a seconds-unit schedule without enforcing the minute allow-list', () => {
    const result = assertMonitorDraftSaveable(
      buildSavedDraft({ [ConfigKey.SCHEDULE]: { number: '30', unit: ScheduleUnit.SECONDS } })
    );
    expect(result.saveable).toBe(true);
  });

  it('rejects an empty locations array', () => {
    const result = assertMonitorDraftSaveable(buildSavedDraft({ [ConfigKey.LOCATIONS]: [] }));
    expect(result.saveable).toBe(false);
    if (!result.saveable) {
      expect(result.missing).toContain('locations (set via set_locations)');
    }
  });
});
