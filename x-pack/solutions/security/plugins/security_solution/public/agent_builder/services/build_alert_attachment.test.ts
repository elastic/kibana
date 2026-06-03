/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { buildAlertAttachmentInput, buildRawDataFromAlert } from './build_alert_attachment';

describe('buildRawDataFromAlert', () => {
  it('preserves @timestamp when ecs data uses alert-table array values', () => {
    const ecsData = {
      _id: 'alert-id',
      _index: '.internal.alerts-security.alerts-default-000001',
      '@timestamp': ['2026-06-02T18:00:00.000Z'],
    } as unknown as Ecs;

    const rawData = buildRawDataFromAlert({
      ecsData,
      nonEcsData: [
        {
          field: '@timestamp',
          value: ['2026-06-02T18:00:00.000Z'],
        },
      ],
    });

    expect(rawData['@timestamp']).toEqual(['2026-06-02T18:00:00.000Z']);
  });
});

describe('buildAlertAttachmentInput', () => {
  it('stores essential alert fields needed for attachment source links', () => {
    const ecsData = {
      _id: 'alert-id',
      _index: '.internal.alerts-security.alerts-default-000001',
      '@timestamp': ['2026-06-02T18:00:00.000Z'],
    } as unknown as Ecs;

    const attachment = buildAlertAttachmentInput({
      ecsData,
      nonEcsData: [
        {
          field: 'kibana.alert.rule.name',
          value: ['AWS CloudTrail Logging Disabled'],
        },
        {
          field: '@timestamp',
          value: ['2026-06-02T18:00:00.000Z'],
        },
      ],
    });

    const parsed = JSON.parse(String(attachment.data?.alert));

    expect(parsed).toEqual(
      expect.objectContaining({
        _id: ['alert-id'],
        _index: ['.internal.alerts-security.alerts-default-000001'],
        '@timestamp': ['2026-06-02T18:00:00.000Z'],
      })
    );
  });
});
