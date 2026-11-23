/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef } from 'react';
import { isEqual } from 'lodash';

/**
 * The same object as long as `value` is deeply equal to it, so that effects and fetches keyed on it
 * don't rerun when a caller rebuilds an equal object, e.g. route params on each navigation.
 */
export const useEqualValue = <T>(value: T): T => {
  const ref = useRef(value);
  if (!isEqual(ref.current, value)) {
    ref.current = value;
  }
  return ref.current;
};
