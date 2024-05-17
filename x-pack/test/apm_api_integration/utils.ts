/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isFiniteNumber } from '@kbn/apm-plugin/common/utils/is_finite_number';
import { Maybe } from '@kbn/apm-plugin/typings/common';
import { Coordinate } from '@kbn/apm-plugin/typings/timeseries';

export function roundNumber(num: Maybe<number>) {
  return isFiniteNumber(num) ? Number(num.toPrecision(4)) : null;
}

export function removeEmptyCoordinates(coordinates: Coordinate[]) {
  return coordinates.filter(({ y }) => isFiniteNumber(y));
}
