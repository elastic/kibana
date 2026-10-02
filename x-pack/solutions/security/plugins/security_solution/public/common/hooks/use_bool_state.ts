/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';

type UseBoolStateReturn = [
  state: boolean,
  setTrue: () => void,
  setFalse: () => void,
  toggle: () => void,
];

export const useBoolState = (initial = false): UseBoolStateReturn => {
  const [state, setState] = useState(initial);

  const setTrue = useCallback(() => {
    setState(true);
  }, []);

  const setFalse = useCallback(() => {
    setState(false);
  }, []);

  const toggle = useCallback(() => {
    setState((val) => !val);
  }, []);

  return [state, setTrue, setFalse, toggle];
};
