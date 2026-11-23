/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';

/**
 * This function has side effects: It stops propagation of the provided
 * `KeyboardEvent` and prevents the browser's default behavior.
 */
export const stopPropagationAndPreventDefault = (event: React.KeyboardEvent) => {
  event.stopPropagation();
  event.preventDefault();
};
