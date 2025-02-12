/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities } from '@kbn/core/public';
import { hasCapabilities, type RequiredCapabilities } from './has_capabilities';

/**
 * class to check if capabilities are granted using the `RequiredCapabilities` format.
 */
export class CapabilitiesChecker {
  constructor(private readonly capabilities: Capabilities) {}
  public has(requiredCapabilities: RequiredCapabilities): boolean {
    return hasCapabilities(this.capabilities, requiredCapabilities);
  }
}
