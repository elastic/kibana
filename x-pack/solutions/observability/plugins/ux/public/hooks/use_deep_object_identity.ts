/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef } from 'react';
import { isEqual } from 'lodash';

// preserve object identity if it is deeply equal to the previous instance of it
export function useDeepObjectIdentity<T>(value: T) {
  const valueRef = useRef<T>(value);

  // update ref if object has changed. Else return the original object and discard the new one
  if (!isEqual(valueRef.current, value)) {
    valueRef.current = value;
  }

  return valueRef.current;
}
