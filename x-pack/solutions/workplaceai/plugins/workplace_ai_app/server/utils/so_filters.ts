/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface KqlFilterBase {
  toKQL(): string;
}

type FilterValue = string | number | boolean;

interface FilterBuilder {
  or(...clauses: KqlFilterBase[]): KqlFilterBase;
  and(...clauses: KqlFilterBase[]): KqlFilterBase;
  equals(field: string, value: FilterValue): KqlFilterBase;
}

/**
 * Create a savedObject filter builder for given SO type.
 */
export const createBuilder = (soType: string): FilterBuilder => {
  const fieldPath = (fieldName: string) => `${soType}.attributes.${fieldName}`;
  const fieldValue = (value: FilterValue) => `${value}`;

  const or = (...clauses: KqlFilterBase[]): KqlFilterBase => {
    return {
      toKQL: () => clauses.map((clause) => '(' + clause.toKQL() + ')').join(' OR '),
    };
  };

  const and = (...clauses: KqlFilterBase[]): KqlFilterBase => {
    return {
      toKQL: () => clauses.map((clause) => '(' + clause.toKQL() + ')').join(' AND '),
    };
  };

  const equals = (name: string, value: FilterValue): KqlFilterBase => {
    return {
      toKQL: () => `${fieldPath(name)}: ${fieldValue(value)}`,
    };
  };

  return {
    or,
    and,
    equals,
  };
};
