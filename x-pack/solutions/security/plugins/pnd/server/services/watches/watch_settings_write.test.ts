/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { parseYamlToJSONWithoutValidation } from '@kbn/workflows-yaml';
import { applyWatchSettingsToYaml, updateWatchSettings } from './watch_settings_write';
import type { WatchWorkflowsManagementClient } from './watch_workflows_management_client';

const scheduledWatchYaml = `version: "1"
name: Dark Watch
description: >
  Original description
enabled: true
tags: [watch]
triggers:
  - type: scheduled
    with:
      every: "1h"
consts:
  watch_policy:
    autonomyLevel: manual
    every: 60
steps:
  - name: run
    type: console
    with:
      message: keep-me
`;

describe('watch settings write', () => {
  it('updates the workflow settings and scheduled trigger without rewriting unrelated YAML', () => {
    const yaml = applyWatchSettingsToYaml(scheduledWatchYaml, {
      enabled: false,
      description: 'Customer description',
      autonomyLevel: 'supervised',
      scheduleInterval: '6h',
    });
    const parsed = parseYamlToJSONWithoutValidation(yaml);

    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.json).toMatchObject({
      enabled: false,
      description: 'Customer description',
      triggers: [{ type: 'scheduled', with: { every: '6h' } }],
      consts: { watch_policy: { autonomyLevel: 'supervised', every: 60 } },
      steps: [{ with: { message: 'keep-me' } }],
    });
    expect(parsed.success && parsed.document.errors).toHaveLength(0);
  });

  it('rejects a schedule interval for a watch without a scheduled trigger', () => {
    expect(() =>
      applyWatchSettingsToYaml(scheduledWatchYaml.replace('type: scheduled', 'type: manual'), {
        enabled: true,
        description: 'Description',
        autonomyLevel: 'assisted',
        scheduleInterval: '15m',
      })
    ).toThrow('no scheduled trigger');
  });

  it('writes through Workflows without a redundant refetch', async () => {
    const management = {
      getWorkflow: jest
        .fn()
        .mockResolvedValueOnce({ id: 'watch-dark', managed: false, yaml: scheduledWatchYaml }),
      updateWorkflow: jest.fn().mockResolvedValue({
        id: 'watch-dark',
        lastUpdatedAt: '2026-08-07T00:00:00.000Z',
        lastUpdatedBy: 'user',
        enabled: false,
        valid: true,
        validationErrors: [],
      }),
    } as unknown as jest.Mocked<WatchWorkflowsManagementClient>;
    const request = {} as KibanaRequest;

    await updateWatchSettings({
      management,
      watchId: 'watch-dark',
      spaceId: 'default',
      request,
      settings: {
        enabled: false,
        description: 'Persisted description',
        autonomyLevel: 'assisted',
        scheduleInterval: '1d',
      },
    });

    expect(management.updateWorkflow).toHaveBeenCalledWith(
      'watch-dark',
      expect.objectContaining({ enabled: false, yaml: expect.any(String) }),
      'default',
      request
    );
    const update = management.updateWorkflow.mock.calls[0][1];
    expect(parseYamlToJSONWithoutValidation(update.yaml ?? '')).toMatchObject({
      success: true,
      json: { triggers: [{ with: { every: '1d' } }] },
    });
    expect(management.getWorkflow).toHaveBeenCalledTimes(1);
  });

  it('rejects malformed source YAML even when tolerant parsing returns JSON', () => {
    expect(() =>
      applyWatchSettingsToYaml('name: Watch\ndescription: brokenenabled: true\n  invalid', {
        enabled: true,
        description: 'Description',
        autonomyLevel: 'manual',
        scheduleInterval: null,
      })
    ).toThrow('cannot be updated');
  });

  it('rejects removing the interval from a scheduled watch', () => {
    expect(() =>
      applyWatchSettingsToYaml(scheduledWatchYaml, {
        enabled: true,
        description: 'Description',
        autonomyLevel: 'manual',
        scheduleInterval: null,
      })
    ).toThrow('requires a schedule interval');
  });
});
