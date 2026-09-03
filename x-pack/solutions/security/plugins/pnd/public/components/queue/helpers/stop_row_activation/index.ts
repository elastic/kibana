/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Nested controls must stop both click and keydown or the row behind them activates. */
export const stopRowActivation = (event: { stopPropagation: () => void }): void => {
  event.stopPropagation();
};
