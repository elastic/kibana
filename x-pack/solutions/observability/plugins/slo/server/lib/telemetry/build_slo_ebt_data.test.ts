/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUE } from '@kbn/slo-schema';
import type { CompositeSLODefinition } from '../../domain/models';
import { createCompositeSlo } from '../../services/fixtures/composite_slo';
import {
  createSLO,
  createSLOWithCalendarTimeWindow,
  createSLOWithTimeslicesBudgetingMethod,
} from '../../services/fixtures/slo';
import { sevenDaysRolling } from '../../services/fixtures/time_window';
import {
  getChangedFields,
  getCompositeChangedFields,
  hashSloId,
  toCompositeSloDefinitionEbtData,
  toCompositeSloDeletedEbtData,
  toSloDefinitionEbtData,
} from './build_slo_ebt_data';

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
    const slo = createSLO({ id: 'slo-1' });

    expect(toSloDefinitionEbtData(slo)).toEqual({
      slo_id: '9cd2c28eb846530755ca1826b281783c2a1d2e23b051248ebb590a85fb6631d3',
      indicator_type: 'sli.apm.transactionDuration',
      budgeting_method: 'occurrences',
      time_window_type: 'rolling',
      grouped: false,
    });
  });

  it('reports the timeslices budgeting method', () => {
    expect(toSloDefinitionEbtData(createSLOWithTimeslicesBudgetingMethod())).toEqual(
      expect.objectContaining({ budgeting_method: 'timeslices' })
    );
  });

  it('reports the calendar aligned time window', () => {
    expect(toSloDefinitionEbtData(createSLOWithCalendarTimeWindow())).toEqual(
      expect.objectContaining({ time_window_type: 'calendarAligned' })
    );
  });

  it.each([
    [ALL_VALUE, false],
    [[ALL_VALUE], false],
    ['host.name', true],
    [['host.name', 'service.name'], true],
  ])('reports groupBy %j as grouped=%s', (groupBy, expected) => {
    expect(toSloDefinitionEbtData(createSLO({ groupBy })).grouped).toBe(expected);
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

describe('toCompositeSloDeletedEbtData', () => {
  it('reports only the hashed composite SLO id', () => {
    const id = 'payments-composite-acme-prod';

    const data = toCompositeSloDeletedEbtData(id);

    expect(data).toEqual({ composite_slo_id: hashSloId(id) });
    expect(data.composite_slo_id).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(data)).not.toContain(id);
  });
});

describe('toCompositeSloDefinitionEbtData', () => {
  it('projects the composite SLO definition without raw ids, names or descriptions', () => {
    const composite = createCompositeSlo({ id: 'composite-1' });

    const data = toCompositeSloDefinitionEbtData(composite);

    expect(data).toEqual({
      composite_slo_id: hashSloId('composite-1'),
      members_count: 2,
      members_with_instance_id_count: 0,
    });
    expect(JSON.stringify(data)).not.toContain(composite.name);
    expect(JSON.stringify(data)).not.toContain(composite.description);
  });

  it('counts the members targeting a specific instanceId', () => {
    const composite = createCompositeSlo({
      members: [
        { sloId: 'a', weight: 1, instanceId: 'host-1' },
        { sloId: 'a', weight: 1, instanceId: 'host-2' },
        { sloId: 'b', weight: 1 },
        { sloId: 'c', weight: 1, instanceId: '' },
      ],
    });

    expect(toCompositeSloDefinitionEbtData(composite)).toEqual(
      expect.objectContaining({ members_count: 4, members_with_instance_id_count: 2 })
    );
  });
});

describe('getCompositeChangedFields', () => {
  it('returns no field for identical definitions', () => {
    const composite = createCompositeSlo();

    expect(getCompositeChangedFields(composite, { ...composite })).toEqual([]);
  });

  it('returns the changed fields', () => {
    const composite = createCompositeSlo();

    expect(
      getCompositeChangedFields(composite, {
        ...composite,
        name: 'new name',
        description: 'new description',
        timeWindow: sevenDaysRolling(),
        objective: { target: 0.95 },
        tags: ['new'],
        enabled: false,
      })
    ).toEqual(['name', 'description', 'timeWindow', 'objective', 'tags', 'enabled']);
  });

  it.each([
    [
      'a member is added',
      (members: CompositeSLODefinition['members']) => [...members, { sloId: 'new', weight: 1 }],
    ],
    ['a member is removed', (members: CompositeSLODefinition['members']) => members.slice(1)],
    [
      'a member weight changes',
      (members: CompositeSLODefinition['members']) => [
        { ...members[0], weight: 99 },
        ...members.slice(1),
      ],
    ],
    [
      'a member instanceId changes',
      (members: CompositeSLODefinition['members']) => [
        { ...members[0], instanceId: 'host-1' },
        ...members.slice(1),
      ],
    ],
  ])('reports members when %s', (_, change) => {
    const composite = createCompositeSlo();

    expect(
      getCompositeChangedFields(composite, { ...composite, members: change(composite.members) })
    ).toEqual(['members']);
  });

  it('ignores the order of the members', () => {
    const composite = createCompositeSlo({
      members: [
        { sloId: 'a', weight: 1, instanceId: 'host-2' },
        { sloId: 'a', weight: 1, instanceId: 'host-1' },
        { sloId: 'b', weight: 3 },
      ],
    });

    expect(
      getCompositeChangedFields(composite, {
        ...composite,
        members: [...composite.members].reverse(),
      })
    ).toEqual([]);
  });

  it('ignores the fields managed by the system', () => {
    const composite = createCompositeSlo();

    expect(
      getCompositeChangedFields(composite, {
        ...composite,
        version: composite.version + 1,
        updatedAt: new Date(),
        updatedBy: 'someone-else',
      })
    ).toEqual([]);
  });
});
