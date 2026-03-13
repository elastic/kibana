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
        "show_all_group_by_instances": true,
        "slos": Array [
          Object {
            "group_by": Array [
              "agent.id",
            ],
            "name": "Legacy SLO",
            "slo_id": "legacy-slo-id",
            "slo_instance_id": "legacy-instance-id",
          },
        ],
      }
    `);
  });

  it('should return state unchanged when already in snake_case', () => {
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
      })
    ).toMatchInlineSnapshot(`
      Object {
        "show_all_group_by_instances": false,
        "slos": Array [
          Object {
            "group_by": Array [
              "url.domain",
            ],
            "name": "New SLO",
            "slo_id": "new-slo-id",
            "slo_instance_id": "new-instance-id",
          },
        ],
      }
    `);
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
    ).toMatchInlineSnapshot(`
      Object {
        "show_all_group_by_instances": true,
        "slos": Array [
          Object {
            "group_by": Array [
              "field.a",
            ],
            "name": "SLO",
            "slo_id": "new-slo-id",
            "slo_instance_id": "new-instance-id",
          },
        ],
      }
    `);
  });

  it('should migrate legacy showAllGroupByInstances to show_all_group_by_instances', () => {
    expect(
      transformAlertsOut({
        showAllGroupByInstances: true,
        slos: [],
      } as unknown as AlertsEmbeddableState)
    ).toMatchInlineSnapshot(`
      Object {
        "show_all_group_by_instances": true,
        "slos": Array [],
      }
    `);
  });

  it('should not include legacy showAllGroupByInstances in output', () => {
    const result = transformAlertsOut({
      showAllGroupByInstances: false,
      slos: [],
    } as unknown as AlertsEmbeddableState);
    expect(result).not.toHaveProperty('showAllGroupByInstances');
    expect(result).toHaveProperty('show_all_group_by_instances', false);
  });

  it('should default show_all_group_by_instances to false when missing', () => {
    expect(transformAlertsOut({ slos: [] })).toMatchObject({
      show_all_group_by_instances: false,
      slos: [],
    });
  });

  it('should handle empty slos array', () => {
    expect(
      transformAlertsOut({
        show_all_group_by_instances: false,
        slos: [],
      })
    ).toEqual({
      show_all_group_by_instances: false,
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
    ).toMatchInlineSnapshot(`
      Object {
        "show_all_group_by_instances": false,
        "slos": Array [
          Object {
            "group_by": Array [],
            "name": "Snake SLO",
            "slo_id": "snake-slo",
            "slo_instance_id": "*",
          },
          Object {
            "group_by": Array [
              "host.name",
            ],
            "name": "Legacy SLO",
            "slo_id": "legacy-slo",
            "slo_instance_id": "instance-1",
          },
        ],
      }
    `);
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
      show_all_group_by_instances: false,
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
          name: '',
          group_by: [],
        },
      ],
    });
  });
});
