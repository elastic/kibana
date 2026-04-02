/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertsEmbeddableState } from '../../../../server/lib/embeddables/alerts_schema';
import { transformAlertsOut } from './transform_alerts_out';

describe('transformAlertsOut', () => {
  it('should transform legacy camelCase state to snake_case', () => {
    expect(
      transformAlertsOut({
        showAllGroupByInstances: true,
        slos: [
          {
            id: 'legacy-slo-id',
            instanceId: 'legacy-instance-id',
            groupBy: ['agent.id'],
            name: 'Legacy SLO',
          },
        ],
      } as unknown as AlertsEmbeddableState)
    ).toMatchInlineSnapshot(`
      Object {
        "slos": Array [
          Object {
            "slo_id": "legacy-slo-id",
            "slo_instance_id": "*",
          },
        ],
      }
    `);
  });

  it('should migrate legacy show_all_group_by_instances true + specific instance to slo_instance_id *', () => {
    expect(
      transformAlertsOut({
        show_all_group_by_instances: true,
        slos: [
          {
            slo_id: 'slo-1',
            slo_instance_id: 'host-1',
            name: 'SLO',
            group_by: ['host.name'],
          },
        ],
      } as unknown as AlertsEmbeddableState)
    ).toEqual({
      slos: [
        {
          slo_id: 'slo-1',
          slo_instance_id: '*',
        },
      ],
    });
  });

  it('should not migrate when show_all_group_by_instances is false', () => {
    expect(
      transformAlertsOut({
        show_all_group_by_instances: false,
        slos: [
          {
            slo_id: 'new-slo-id',
            slo_instance_id: 'new-instance-id',
            name: 'New SLO',
            group_by: ['url.domain'],
          },
        ],
      } as unknown as AlertsEmbeddableState)
    ).toEqual({
      slos: [
        {
          slo_id: 'new-slo-id',
          slo_instance_id: 'new-instance-id',
        },
      ],
    });
  });

  it('should prefer snake_case fields over legacy camelCase when both are present', () => {
    expect(
      transformAlertsOut({
        show_all_group_by_instances: true,
        showAllGroupByInstances: false,
        slos: [
          {
            slo_id: 'new-slo-id',
            slo_instance_id: 'new-instance-id',
            id: 'legacy-slo-id',
            instanceId: 'legacy-instance-id',
            name: 'SLO',
            group_by: ['field.a'],
            groupBy: ['field.b'],
          },
        ],
      } as unknown as AlertsEmbeddableState)
    ).toEqual({
      slos: [
        {
          slo_id: 'new-slo-id',
          slo_instance_id: '*',
        },
      ],
    });
  });

  it('should not include show_all_group_by_instances or showAllGroupByInstances in output', () => {
    const result = transformAlertsOut({
      showAllGroupByInstances: false,
      slos: [],
    } as unknown as AlertsEmbeddableState);
    expect(result).not.toHaveProperty('showAllGroupByInstances');
    expect(result).not.toHaveProperty('show_all_group_by_instances');
  });

  it('should handle empty slos array', () => {
    expect(transformAlertsOut({ slos: [] } as unknown as AlertsEmbeddableState)).toEqual({
      slos: [],
    });
  });

  it('should handle mixed legacy and snake_case slo items', () => {
    expect(
      transformAlertsOut({
        show_all_group_by_instances: false,
        slos: [
          {
            slo_id: 'snake-slo',
            slo_instance_id: '*',
            name: 'Snake SLO',
            group_by: [],
          },
          {
            id: 'legacy-slo',
            instanceId: 'instance-1',
            groupBy: ['host.name'],
            name: 'Legacy SLO',
          },
        ],
      } as unknown as AlertsEmbeddableState)
    ).toEqual({
      slos: [
        {
          slo_id: 'snake-slo',
          slo_instance_id: '*',
        },
        {
          slo_id: 'legacy-slo',
          slo_instance_id: 'instance-1',
        },
      ],
    });
  });

  it('should preserve other state properties (e.g. title, drilldowns)', () => {
    expect(
      transformAlertsOut({
        title: 'My Alerts Panel',
        show_all_group_by_instances: false,
        slos: [],
      } as unknown as AlertsEmbeddableState)
    ).toMatchObject({
      title: 'My Alerts Panel',
      slos: [],
    });
  });

  it('should handle legacy slo item with missing optional fields', () => {
    expect(
      transformAlertsOut({
        slos: [
          {
            id: 'slo-1',
            instanceId: '*',
          },
        ],
      } as unknown as AlertsEmbeddableState)
    ).toMatchObject({
      slos: [
        {
          slo_id: 'slo-1',
          slo_instance_id: '*',
        },
      ],
    });
  });

  it('should deduplicate when toggle-on migration produces multiple * entries for the same SLO', () => {
    expect(
      transformAlertsOut({
        show_all_group_by_instances: true,
        slos: [
          { slo_id: 'slo-1', slo_instance_id: '28a4644d-588a-4885-9c0a-8ba0835a0eb5' },
          { slo_id: 'slo-1', slo_instance_id: '604da781-44e2-4880-8cd4-b8ca97c101ab' },
          { slo_id: 'slo-1', slo_instance_id: 'd399ed18-2ad2-421a-b937-2687251b850c' },
        ],
      } as unknown as AlertsEmbeddableState)
    ).toEqual({
      slos: [{ slo_id: 'slo-1', slo_instance_id: '*' }],
    });
  });

  it('should default missing slo_instance_id to * for pure snake_case items (schema parity)', () => {
    expect(
      transformAlertsOut({
        show_all_group_by_instances: false,
        slos: [{ slo_id: 'slo-1' }],
      } as unknown as AlertsEmbeddableState)
    ).toEqual({
      slos: [{ slo_id: 'slo-1', slo_instance_id: '*' }],
    });
  });

  it('should not migrate slo_instance_id when already *', () => {
    expect(
      transformAlertsOut({
        show_all_group_by_instances: true,
        slos: [
          {
            slo_id: 'slo-1',
            slo_instance_id: '*',
            name: 'SLO',
            group_by: ['host.name'],
          },
        ],
      } as unknown as AlertsEmbeddableState)
    ).toEqual({
      slos: [
        {
          slo_id: 'slo-1',
          slo_instance_id: '*',
        },
      ],
    });
  });
});
