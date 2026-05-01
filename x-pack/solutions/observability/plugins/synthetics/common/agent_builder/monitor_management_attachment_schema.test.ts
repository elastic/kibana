/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigKey } from '../constants/monitor_management';
import {
  MonitorTypeEnum,
  ScheduleUnit,
  SourceType,
} from '../runtime_types/monitor_management/monitor_configs';
import {
  MONITOR_MANAGEMENT_ATTACHMENT_TYPE,
  MONITOR_SML_TYPE,
} from './monitor_management_constants';
import {
  monitorAttachmentDataSchema,
  monitorDraftSchema,
  type MonitorAttachmentData,
  type MonitorDraft,
} from './monitor_management_attachment_schema';

const buildBaseRequiredFields = (): MonitorAttachmentData => ({
  [ConfigKey.NAME]: 'Elastic API health',
  [ConfigKey.MONITOR_TYPE]: MonitorTypeEnum.HTTP,
  [ConfigKey.ENABLED]: true,
  [ConfigKey.SCHEDULE]: { number: '5', unit: ScheduleUnit.MINUTES },
  [ConfigKey.LOCATIONS]: [
    { id: 'us_central', label: 'North America - US Central', isServiceManaged: true },
  ],
  [ConfigKey.URLS]: 'https://api.elastic.co',
});

const baseRequiredFields = buildBaseRequiredFields();

describe('monitor_management_constants', () => {
  it('exposes the agreed attachment type id', () => {
    expect(MONITOR_MANAGEMENT_ATTACHMENT_TYPE).toBe('synthetics.monitor_management');
  });

  it('exposes the agreed SML type id', () => {
    expect(MONITOR_SML_TYPE).toBe('synthetics_monitor');
  });

  it('does not collide with the observability_agent_builder preset attachment id', () => {
    // The preset-context attachment registered by observability_agent_builder
    // is `'observability.synthetics_monitor'`. Authoring/management is a
    // distinct integration with a different lifecycle and id.
    expect(MONITOR_MANAGEMENT_ATTACHMENT_TYPE).not.toBe('observability.synthetics_monitor');
  });
});

describe('monitorAttachmentDataSchema', () => {
  it('accepts a proposed monitor (no config_id, no monitor query id, no SO meta)', () => {
    const proposed = { ...baseRequiredFields };

    const result = monitorAttachmentDataSchema.safeParse(proposed);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[ConfigKey.CONFIG_ID]).toBeUndefined();
      expect(result.data[ConfigKey.MONITOR_QUERY_ID]).toBeUndefined();
      expect(result.data.created_at).toBeUndefined();
      expect(result.data.updated_at).toBeUndefined();
    }
  });

  it('accepts a saved monitor with config_id and SO meta populated', () => {
    const saved = {
      ...baseRequiredFields,
      [ConfigKey.CONFIG_ID]: '6d7a8d8b-0e1f-4d97-a8d6-1f2a3b4c5d6e',
      [ConfigKey.MONITOR_QUERY_ID]: '6d7a8d8b-0e1f-4d97-a8d6-1f2a3b4c5d6e',
      [ConfigKey.REVISION]: 3,
      [ConfigKey.MONITOR_SOURCE_TYPE]: SourceType.UI,
      created_at: '2026-04-15T10:00:00.000Z',
      updated_at: '2026-04-30T17:00:00.000Z',
    };

    const result = monitorAttachmentDataSchema.safeParse(saved);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[ConfigKey.CONFIG_ID]).toBe(saved[ConfigKey.CONFIG_ID]);
      expect(result.data[ConfigKey.REVISION]).toBe(3);
      expect(result.data[ConfigKey.MONITOR_SOURCE_TYPE]).toBe(SourceType.UI);
    }
  });

  it('accepts a project-origin monitor (origin: project)', () => {
    const projectMonitor = {
      ...baseRequiredFields,
      [ConfigKey.CONFIG_ID]: 'project-cli-managed-id',
      [ConfigKey.MONITOR_SOURCE_TYPE]: SourceType.PROJECT,
    };

    const result = monitorAttachmentDataSchema.safeParse(projectMonitor);

    expect(result.success).toBe(true);
  });

  it('accepts a private location with agentPolicyId', () => {
    const withPrivateLocation = {
      ...baseRequiredFields,
      [ConfigKey.LOCATIONS]: [
        {
          id: 'pl-london',
          label: 'London',
          agentPolicyId: 'fleet-agent-policy-id',
          isServiceManaged: false,
        },
      ],
    };

    const result = monitorAttachmentDataSchema.safeParse(withPrivateLocation);

    expect(result.success).toBe(true);
    if (result.success) {
      const [location] = result.data[ConfigKey.LOCATIONS];
      expect(location).toMatchObject({
        id: 'pl-london',
        agentPolicyId: 'fleet-agent-policy-id',
      });
    }
  });

  it('accepts HTTP-specific options used by set_http_check (T4 op)', () => {
    const withHttpDetails = {
      ...baseRequiredFields,
      [ConfigKey.MAX_REDIRECTS]: 5,
      [ConfigKey.REQUEST_METHOD_CHECK]: 'GET',
      [ConfigKey.PORT]: 443,
      [ConfigKey.IGNORE_HTTPS_ERRORS]: false,
    };

    const result = monitorAttachmentDataSchema.safeParse(withHttpDetails);

    expect(result.success).toBe(true);
  });

  it('accepts string max_redirects (yaml-style)', () => {
    // `MAX_REDIRECTS` mirrors the io-ts union of string | number — the
    // string variant is what the yaml-config path produces and what we
    // can receive from a GET response in some legacy fixtures.
    const result = monitorAttachmentDataSchema.safeParse({
      ...baseRequiredFields,
      [ConfigKey.MAX_REDIRECTS]: '0',
    });
    expect(result.success).toBe(true);
  });

  it('accepts null url.port', () => {
    const result = monitorAttachmentDataSchema.safeParse({
      ...baseRequiredFields,
      [ConfigKey.PORT]: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty name', () => {
    const result = monitorAttachmentDataSchema.safeParse({
      ...baseRequiredFields,
      [ConfigKey.NAME]: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-HTTP type (v1 scope is HTTP only)', () => {
    const result = monitorAttachmentDataSchema.safeParse({
      ...baseRequiredFields,
      [ConfigKey.MONITOR_TYPE]: MonitorTypeEnum.TCP,
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty locations array', () => {
    const result = monitorAttachmentDataSchema.safeParse({
      ...baseRequiredFields,
      [ConfigKey.LOCATIONS]: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a location without an id', () => {
    const result = monitorAttachmentDataSchema.safeParse({
      ...baseRequiredFields,
      [ConfigKey.LOCATIONS]: [{ label: 'orphan' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty urls string', () => {
    const result = monitorAttachmentDataSchema.safeParse({
      ...baseRequiredFields,
      [ConfigKey.URLS]: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a malformed schedule unit', () => {
    const result = monitorAttachmentDataSchema.safeParse({
      ...baseRequiredFields,
      [ConfigKey.SCHEDULE]: { number: '5', unit: 'h' },
    });
    expect(result.success).toBe(false);
  });

  it('uses ConfigKey-aligned key names (parity rule)', () => {
    const parsed = monitorAttachmentDataSchema.parse(baseRequiredFields);

    // The shape must use ConfigKey *values* (e.g. `'name'`, `'urls'`,
    // `'url.port'`) not arbitrary aliases — this is the contract with the
    // CRUD response codec.
    expect(parsed).toHaveProperty(ConfigKey.NAME);
    expect(parsed).toHaveProperty(ConfigKey.URLS);
    expect(parsed).toHaveProperty(ConfigKey.SCHEDULE);
    expect(parsed).toHaveProperty(ConfigKey.LOCATIONS);
    expect(parsed).toHaveProperty(ConfigKey.MONITOR_TYPE);
    expect(parsed).toHaveProperty(ConfigKey.ENABLED);
  });
});

describe('monitorDraftSchema (permissive, for in-memory operations[])', () => {
  it('accepts an empty draft (no operations applied yet)', () => {
    const result = monitorDraftSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts a draft after only set_metadata (no schedule/locations/urls yet)', () => {
    const result = monitorDraftSchema.safeParse({
      [ConfigKey.NAME]: 'WIP - Elastic API',
      [ConfigKey.TAGS]: ['poc'],
    });
    expect(result.success).toBe(true);
  });

  it('accepts a partial draft with only schedule set', () => {
    const result = monitorDraftSchema.safeParse({
      [ConfigKey.SCHEDULE]: { number: '5', unit: ScheduleUnit.MINUTES },
    });
    expect(result.success).toBe(true);
  });

  it('still rejects malformed values when present (parity with attachment schema)', () => {
    const result = monitorDraftSchema.safeParse({
      [ConfigKey.SCHEDULE]: { number: '5', unit: 'invalid' },
    });
    expect(result.success).toBe(false);
  });

  it('a fully-populated draft round-trips into the attachment schema', () => {
    // The draft schema is a strict superset (key-wise) of the attachment
    // schema — once all required keys are present, the boundary validator
    // can promote it without any key renaming or shape massaging.
    const draft: MonitorDraft = { ...baseRequiredFields };

    const promoted = monitorAttachmentDataSchema.safeParse(draft);
    expect(promoted.success).toBe(true);
  });
});

describe('static type parity (does not run at runtime)', () => {
  it('MonitorAttachmentData carries the required keys as non-optional', () => {
    // This block intentionally fails type-check if the Zod inference for
    // required keys regresses. It does not assert anything at runtime.
    const data: MonitorAttachmentData = { ...baseRequiredFields };
    expect(data[ConfigKey.NAME]).toBeDefined();
    expect(data[ConfigKey.URLS]).toBeDefined();
  });
});
