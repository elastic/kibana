/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectable, multiInject, optional } from 'inversify';
import { DuplicateStrategyError } from '../errors/duplicate_strategy_error';
import { DetectionStrategy } from './detection_strategy';

/** The detection strategies bound in the container, by id. */
@injectable()
export class StrategyCatalog {
  private readonly strategiesById: Map<string, DetectionStrategy>;

  // Optional: the engine starts with no strategy bound, and the catalog is then empty.
  constructor(@multiInject(DetectionStrategy) @optional() strategies: DetectionStrategy[] = []) {
    this.strategiesById = indexStrategiesById(strategies);
  }

  /** Every strategy, in binding order. */
  public list(): DetectionStrategy[] {
    return [...this.strategiesById.values()];
  }

  /** The strategy with this descriptor id, or `undefined` when none is bound. */
  public get(id: string): DetectionStrategy | undefined {
    return this.strategiesById.get(id);
  }
}

const indexStrategiesById = (strategies: DetectionStrategy[]): Map<string, DetectionStrategy> => {
  const duplicate = strategies.find(
    ({ descriptor }, index) =>
      strategies.findIndex((other) => other.descriptor.id === descriptor.id) !== index
  );

  if (duplicate) {
    throw new DuplicateStrategyError(duplicate.descriptor.id);
  }

  return new Map(strategies.map((strategy) => [strategy.descriptor.id, strategy]));
};
