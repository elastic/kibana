/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ThreeWayDiff, ThreeWayDiffAlgorithm } from '../three_way_diff/three_way_diff';

export type FieldsDiff<TObject> = Required<{
  [Field in keyof TObject]: ThreeWayDiff<TObject[Field]>;
}>;

export type FieldsDiffAlgorithmsFor<TObject> = Required<{
  [Field in keyof TObject]: ThreeWayDiffAlgorithm<TObject[Field]>;
}>;
