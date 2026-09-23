/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

export const subscribeMonitorFiltersCleared = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const notifyMonitorFiltersCleared = (): void => {
  listeners.forEach((listener) => listener());
};
