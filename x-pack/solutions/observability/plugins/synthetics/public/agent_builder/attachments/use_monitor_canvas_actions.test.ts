/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigKey } from '../../../common/runtime_types';
import {
  MonitorTypeEnum,
  ScheduleUnit,
  SourceType,
} from '../../../common/runtime_types/monitor_management/monitor_configs';
import type { MonitorAttachmentData } from '../../../common/agent_builder';
import {
  projectMonitorWithLastSaved,
  type MonitorCanvasLastSavedSnapshot,
} from './use_monitor_canvas_actions';

const buildMonitor = (overrides: Partial<MonitorAttachmentData> = {}): MonitorAttachmentData => ({
  [ConfigKey.NAME]: 'Smoke check',
  [ConfigKey.MONITOR_TYPE]: MonitorTypeEnum.HTTP,
  [ConfigKey.ENABLED]: true,
  [ConfigKey.SCHEDULE]: { number: '5', unit: ScheduleUnit.MINUTES },
  [ConfigKey.LOCATIONS]: [{ id: 'us_central', label: 'US Central', isServiceManaged: true }],
  [ConfigKey.URLS]: 'https://example.com',
  [ConfigKey.MONITOR_SOURCE_TYPE]: SourceType.UI,
  ...overrides,
});

const lastSaved = (
  overrides: Partial<MonitorCanvasLastSavedSnapshot> = {}
): MonitorCanvasLastSavedSnapshot => ({
  configId: 'persisted-config-id',
  name: 'Smoke check',
  url: 'https://example.com',
  ...overrides,
});

describe('projectMonitorWithLastSaved', () => {
  // Why this exists at all: the framework's `updateOrigin` does not
  // refresh the attachment data after a successful Create (followup
  // F14). The canvas overlays the just-assigned `config_id` via this
  // projector so the next render flips to **Update** + **View**
  // instead of staying on **Create** and round-tripping a
  // duplicate-name `POST` to Synthetics. The tests below pin the
  // exact branches that decide whether the overlay applies.

  it('returns the original data unchanged when no `lastSaved` snapshot is present (steady state)', () => {
    const data = buildMonitor();
    expect(projectMonitorWithLastSaved(data, undefined)).toBe(data);
  });

  it('returns the original data unchanged when the data already carries `config_id` (post-refresh state)', () => {
    // Once the framework or the agent's tool refreshes the data, the
    // overlay must defer to the real value — otherwise we would mask
    // an already-saved monitor whose configId differs from a stale
    // snapshot.
    const data = buildMonitor({ [ConfigKey.CONFIG_ID]: 'real-config-id' });
    const projected = projectMonitorWithLastSaved(data, lastSaved({ configId: 'stale-id' }));
    expect(projected).toBe(data);
    expect(projected[ConfigKey.CONFIG_ID]).toBe('real-config-id');
  });

  it('overlays `config_id` when `lastSaved.name` + `lastSaved.url` match the in-memory data (post-Create flip)', () => {
    const data = buildMonitor();
    const projected = projectMonitorWithLastSaved(data, lastSaved());
    expect(projected).not.toBe(data);
    expect(projected[ConfigKey.CONFIG_ID]).toBe('persisted-config-id');
    // The rest of the data is preserved — only `config_id` is added.
    expect(projected[ConfigKey.NAME]).toBe(data[ConfigKey.NAME]);
    expect(projected[ConfigKey.URLS]).toBe(data[ConfigKey.URLS]);
    expect(projected[ConfigKey.LOCATIONS]).toEqual(data[ConfigKey.LOCATIONS]);
  });

  it('does NOT overlay when `lastSaved.name` does not match the current data (different attachment in canvas)', () => {
    // Canvas component instances may be reused across attachments
    // without remount. Overlaying `lastSaved.configId` onto the
    // wrong monitor would cause an Update click to `PUT` the new
    // monitor's data over the previous monitor's saved object —
    // silent data loss. The name guard is the cheapest stable
    // identity we have without dragging the framework attachment
    // id into the body component.
    const data = buildMonitor({ [ConfigKey.NAME]: 'Other monitor' });
    const projected = projectMonitorWithLastSaved(data, lastSaved({ name: 'Smoke check' }));
    expect(projected).toBe(data);
    expect(projected[ConfigKey.CONFIG_ID]).toBeUndefined();
  });

  it('does NOT overlay when `lastSaved.url` does not match the current data (different attachment in canvas)', () => {
    const data = buildMonitor({ [ConfigKey.URLS]: 'https://other.example.com' });
    const projected = projectMonitorWithLastSaved(data, lastSaved({ url: 'https://example.com' }));
    expect(projected).toBe(data);
    expect(projected[ConfigKey.CONFIG_ID]).toBeUndefined();
  });
});
