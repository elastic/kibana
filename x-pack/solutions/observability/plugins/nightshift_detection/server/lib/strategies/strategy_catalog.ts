/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectable, multiInject, optional } from 'inversify';
import { DuplicateStrategyError } from './duplicate_strategy_error';
import { DetectionStrategy } from './tokens';
import type { IDetectionStrategy } from './types';

/** The detection strategies bound in the container, by id. */
@injectable()
export class StrategyCatalog {
  private readonly strategiesById: Map<string, IDetectionStrategy>;

  // Optional: the engine starts with no strategy bound, and the catalog is then empty.
  constructor(@multiInject(DetectionStrategy) @optional() strategies: IDetectionStrategy[] = []) {
    this.strategiesById = indexStrategiesById(strategies);
  }

  /** Every strategy, in binding order. */
  public list(): IDetectionStrategy[] {
    return [...this.strategiesById.values()];
  }

  /** The strategy with this descriptor id, or `undefined` when none is bound. */
  public get(id: string): IDetectionStrategy | undefined {
    return this.strategiesById.get(id);
  }
}

const indexStrategiesById = (strategies: IDetectionStrategy[]): Map<string, IDetectionStrategy> => {
  const duplicate = strategies.find(
    ({ descriptor }, index) =>
      strategies.findIndex((other) => other.descriptor.id === descriptor.id) !== index
  );

  if (duplicate) {
    throw new DuplicateStrategyError(duplicate.descriptor.id);
  }

  return new Map(strategies.map((strategy) => [strategy.descriptor.id, strategy]));
};
