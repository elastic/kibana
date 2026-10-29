/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUE } from '@kbn/slo-schema';
import {
  createSLO,
  createSLOWithCalendarTimeWindow,
  createSLOWithTimeslicesBudgetingMethod,
} from '../../services/fixtures/slo';
import { getChangedFields, hashSloId, toSloDefinitionEbtData } from './build_slo_ebt_data';

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
