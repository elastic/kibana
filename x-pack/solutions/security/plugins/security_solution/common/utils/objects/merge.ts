/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fp from 'lodash/fp';
import type { Expand } from './types';

interface Merge {
  <Source extends object, Target extends object>(source: Source): (
    target: Target
  ) => Expand<Target & Source>;
  <Source extends object, Target extends object>(target: Target, source: Source): Expand<
    Target & Source
  >;
}

/**
 * Proxy for lodash `merge` with better types
 */
export const merge: Merge = <S, T>(...args: [S] | [S, T]) => {
  if (args.length === 2) {
    const [target, source] = args;
    return fp.merge(target, source);
  }
  const [source] = args;
  return (target) => fp.merge(target, source);
};
