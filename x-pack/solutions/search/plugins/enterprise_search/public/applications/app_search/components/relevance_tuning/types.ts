/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum BoostType {
  Value = 'value',
  Functional = 'functional',
  Proximity = 'proximity',
}

export enum FunctionalBoostFunction {
  Logarithmic = 'logarithmic',
  Exponential = 'exponential',
  Linear = 'linear',
}

export enum ProximityBoostFunction {
  Gaussian = 'gaussian',
  Exponential = 'exponential',
  Linear = 'linear',
}

export type BoostFunction = FunctionalBoostFunction | ProximityBoostFunction;

export enum BoostOperation {
  Add = 'add',
  Multiply = 'multiply',
}
export interface Boost {
  type: BoostType;
  operation?: BoostOperation;
  function?: BoostFunction;
  newBoost?: boolean;
  center?: string | number;
  factor: number;
  value?: string[];
}

// A boost that comes from the server, before we normalize it has a much looser schema
export interface RawBoost extends Omit<Boost, 'value'> {
  value?: string | number | boolean | object | Array<string | number | boolean | object>;
}

export interface ValueBoost extends Boost {
  value: string[];
  operation: undefined;
  function: undefined;
}

export interface FunctionalBoost extends Boost {
  value: undefined;
  operation: BoostOperation;
  function: FunctionalBoostFunction;
}

export interface ProximityBoost extends Boost {
  value: undefined;
  operation: undefined;
  function: ProximityBoostFunction;
}
export interface SearchField {
  weight: number;
}

export interface SearchSettingsRequest {
  boosts: Record<string, Boost[]>;
  search_fields: Record<string, SearchField>;
  result_fields?: object;
  precision: number;
}

export interface SearchSettings extends SearchSettingsRequest {
  precision_enabled: boolean;
}
