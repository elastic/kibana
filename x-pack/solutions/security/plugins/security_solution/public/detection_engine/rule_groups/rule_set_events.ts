/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { Subject } from 'rxjs';

/**
 * Rule sets can be created outside the rules page React tree (from a card in the AI agent chat).
 * The rules page listens, refreshes its lists and opens the new set.
 */
const ruleSetCreated$ = new Subject<{ id: string }>();

export const notifyRuleSetCreated = (id: string): void => ruleSetCreated$.next({ id });

export const useOnRuleSetCreated = (onCreated: (id: string) => void): void => {
  const callback = useRef(onCreated);
  callback.current = onCreated;
  useEffect(() => {
    const subscription = ruleSetCreated$.subscribe(({ id }) => callback.current(id));
    return () => subscription.unsubscribe();
  }, []);
};
