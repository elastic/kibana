/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUE } from '@kbn/slo-schema';
import { Duration, DurationUnit } from '../../domain/models';
import {
  createKQLCustomIndicator,
  createSLO,
  createSLOWithCalendarTimeWindow,
  createSLOWithTimeslicesBudgetingMethod,
} from '../../services/fixtures/slo';
import { getChangedFields, hashSloId, toSloDefinitionEbtData } from './build_slo_ebt_data';

const CREATED_AT = new Date('2026-10-01T10:00:00.000Z');

describe('hashSloId', () => {
  it('returns a stable SHA-256 hex digest that does not contain the id', () => {
    const sloId = 'payments-customer-acme-prod';

    expect(hashSloId(sloId)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashSloId(sloId)).toBe(hashSloId(sloId));
    expect(hashSloId(sloId)).not.toContain(sloId);
    expect(hashSloId('slo-1')).toBe(
      '9cd2c28eb846530755ca1826b281783c2a1d2e23b051248ebb590a85fb6631d3'
    );
  });
});

describe('toSloDefinitionEbtData', () => {
  it('projects the default SLO definition', () => {
    const slo = createSLO({ id: 'slo-1', createdAt: CREATED_AT });

    expect(toSloDefinitionEbtData(slo)).toEqual({
      slo_id: '9cd2c28eb846530755ca1826b281783c2a1d2e23b051248ebb590a85fb6631d3',
      revision: 1,
      indicator_type: 'sli.apm.transactionDuration',
      budgeting_method: 'occurrences',
      time_window_type: 'rolling',
      time_window_duration: '7d',
      objective_target: 0.999,
      group_by_count: 0,
      tags_count: 2,
      dashboards_count: 0,
      enabled: true,
      created_at: '2026-10-01T10:00:00.000Z',
      settings: {
        sync_delay: '1m',
        frequency: '1m',
        prevent_initial_backfill: false,
        has_sync_field: false,
        has_project_routing: false,
      },
    });
  });

  it('includes the timeslice objective for a timeslices SLO', () => {
    const slo = createSLOWithTimeslicesBudgetingMethod();

    expect(toSloDefinitionEbtData(slo)).toEqual(
      expect.objectContaining({
        budgeting_method: 'timeslices',
        timeslice_target: slo.objective.timesliceTarget,
        timeslice_window: slo.objective.timesliceWindow?.format(),
      })
    );
  });

  it('omits the timeslice objective for an occurrences SLO', () => {
    const data = toSloDefinitionEbtData(createSLO());

    expect(data.timeslice_target).toBeUndefined();
    expect(data.timeslice_window).toBeUndefined();
  });

  it('reports the calendar aligned time window', () => {
    const slo = createSLOWithCalendarTimeWindow();

    expect(toSloDefinitionEbtData(slo)).toEqual(
      expect.objectContaining({
        time_window_type: 'calendarAligned',
        time_window_duration: slo.timeWindow.duration.format(),
      })
    );
  });

  it.each([
    [ALL_VALUE, 0],
    [[ALL_VALUE], 0],
    ['host.name', 1],
    [['host.name', 'service.name'], 2],
  ])('counts groupBy %j as %i fields', (groupBy, expected) => {
    expect(toSloDefinitionEbtData(createSLO({ groupBy })).group_by_count).toBe(expected);
  });

  it('counts the linked dashboards', () => {
    const slo = createSLO({ artifacts: { dashboards: [{ id: 'dash-1' }, { id: 'dash-2' }] } });

    expect(toSloDefinitionEbtData(slo).dashboards_count).toBe(2);
  });

  it('reports the settings without their values', () => {
    const slo = createSLO({
      indicator: createKQLCustomIndicator(),
      settings: {
        syncDelay: new Duration(5, DurationUnit.Minute),
        frequency: new Duration(2, DurationUnit.Minute),
        preventInitialBackfill: true,
        syncField: 'event.ingested',
        projectRoutings: '_alias:_origin',
      },
    });

    expect(toSloDefinitionEbtData(slo).settings).toEqual({
      sync_delay: '5m',
      frequency: '2m',
      prevent_initial_backfill: true,
      has_sync_field: true,
      has_project_routing: true,
    });
  });

  it('reports no project routing when it is null', () => {
    const slo = createSLO();
    slo.settings.projectRoutings = null;

    expect(toSloDefinitionEbtData(slo).settings.has_project_routing).toBe(false);
  });
});

describe('getChangedFields', () => {
  it('returns no field for identical definitions', () => {
    const slo = createSLO();

    expect(getChangedFields(slo, { ...slo })).toEqual([]);
  });

  it('returns the changed fields', () => {
    const slo = createSLO();

    expect(
      getChangedFields(slo, { ...slo, name: 'new name', tags: ['new'], groupBy: 'host.name' })
    ).toEqual(['name', 'tags', 'groupBy']);
  });

  it('ignores the fields managed by the system', () => {
    const slo = createSLO();

    expect(
      getChangedFields(slo, {
        ...slo,
        revision: slo.revision + 1,
        updatedAt: new Date(),
        updatedBy: 'someone-else',
      })
    ).toEqual([]);
  });
});
