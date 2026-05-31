/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionIntent, ActionType } from './types';

/**
 * Parse natural language into structured isolate/unisolate intent.
 */
export function parseIntent(message: string): ActionIntent | null {
  const lower = message.toLowerCase().trim();
  // TODO: implement regex/pattern extraction
  return null;
}
