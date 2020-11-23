/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import diffDefault from 'jest-diff';

export const assertionErrMsg = (actual) => (expected) => diffDefault(actual, expected);

export const drop = dropped => x => x.replace(dropped, '');

export const dropWhiteSpace = drop(/\s{1,}/gm)

export const dropNewLines = drop(/\n/gm)

const pipe = (...fns) => fns.reduce((f, g) => (...args) => g(f(...args)));

export const dropAllNonAlphaNumeric = pipe(dropWhiteSpace, dropNewLines)
