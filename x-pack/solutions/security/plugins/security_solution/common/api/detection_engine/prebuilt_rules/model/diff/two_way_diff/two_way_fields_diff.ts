/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The entire two-way fields diff return object
 *
 * Contains every field compared by the two-way diff algorithms and their values.
 */
export type TwoWayFieldsDiff<TObject> = Required<{
  [Field in keyof TObject]: TwoWayDiff;
}>;

/**
 * The result of a two-way field diff comparison
 *
 * We use this to determine whether the two fields are equal to one another
 * and easily filter out fields that are different. It also contains the field
 * values compared for reference.
 */
export interface TwoWayDiff {
  is_equal: boolean;
  value_a: unknown;
  value_b: unknown;
}
