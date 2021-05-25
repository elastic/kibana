/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Coordinate } from '../../plugins/apm/typings/timeseries';
import { isFiniteNumber } from '../../plugins/apm/common/utils/is_finite_number';
import { Maybe } from '../../plugins/apm/typings/common';

export function roundNumber(num: Maybe<number>) {
  return isFiniteNumber(num) ? num.toPrecision(4) : '';
}

export function removeEmptyCoordinates(coordinates: Coordinate[]) {
  return coordinates.filter(({ y }) => isFiniteNumber(y));
}
