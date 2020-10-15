/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Chance from 'chance';

const chance = new Chance();
const CHARS_POOL = 'abcdefghijklmnopqrstuvwxyz';

export const nextTick = (time = 0) => new Promise((resolve) => setTimeout(resolve, time));

export const getRandomNumber = (range: { min: number; max: number } = { min: 1, max: 20 }) =>
  chance.integer(range);

export const getRandomString = (options = {}) =>
  `${chance.string({ pool: CHARS_POOL, ...options })}-${Date.now()}`;
