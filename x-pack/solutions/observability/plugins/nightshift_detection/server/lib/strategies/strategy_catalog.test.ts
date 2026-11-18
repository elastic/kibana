/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Container } from 'inversify';
import { TEST_STRATEGY_ID, createTestStrategy } from '../../test_utils/test_strategy';
import { DuplicateStrategyError } from '../errors/duplicate_strategy_error';
import { InvalidStrategyScheduleError } from '../errors/invalid_strategy_schedule_error';
import { DetectionStrategy } from './detection_strategy';
import { StrategyCatalog } from './strategy_catalog';

function createCatalog(strategies: Array<ReturnType<typeof createTestStrategy>>): StrategyCatalog {
  const container = new Container({ defaultScope: 'Singleton' });
  strategies.forEach((strategy) => container.bind(DetectionStrategy).toConstantValue(strategy));
  container.bind(StrategyCatalog).toSelf();

  return container.get(StrategyCatalog);
}

describe('StrategyCatalog', () => {
  it('finds a bound strategy by its descriptor id', () => {
    const strategy = createTestStrategy();
    const catalog = createCatalog([strategy]);

    expect(catalog.get(TEST_STRATEGY_ID)).toBe(strategy);
    expect(catalog.list()).toEqual([strategy]);
    expect(catalog.get('missing')).toBeUndefined();
  });

  it('rejects two strategies with the same id', () => {
    expect(() => createCatalog([createTestStrategy(), createTestStrategy()])).toThrow(
      DuplicateStrategyError
    );
  });

  it.each([
    { cadence: 0, settle: 0 },
    { cadence: 1.5, settle: 0 },
    { cadence: Number.NaN, settle: 0 },
    { cadence: 1, settle: -1 },
  ])(
    'rejects a strategy with a cadence of $cadence and a settle of $settle',
    ({ cadence, settle }) => {
      const strategy = createTestStrategy();
      const unplannable = {
        ...strategy,
        descriptor: { ...strategy.descriptor, cadence_minutes: cadence, settle_minutes: settle },
      };

      expect(() => createCatalog([unplannable])).toThrow(InvalidStrategyScheduleError);
    }
  );

  it('is empty when no strategy is bound', () => {
    expect(createCatalog([]).list()).toEqual([]);
  });
});
