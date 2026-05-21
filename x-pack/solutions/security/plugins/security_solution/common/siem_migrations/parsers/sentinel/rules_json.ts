/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SentinelArmResource } from '../../model/vendor/rules/sentinel.gen';
import type { SentinelRule } from './types';

/**
 * Processes pre-validated Sentinel ARM template resources into SentinelRule objects.
 *
 * Only "Scheduled" rule kinds are extracted, as these map to detection rules.
 * The resources array is expected to be already validated by the API schema.
 */
export class SentinelRulesParser {
  private readonly resources: SentinelArmResource[];

  constructor(resources: SentinelArmResource[]) {
    this.resources = resources;
  }

  /**
   * Returns all valid Scheduled Analytics Rules from the resources.
   */
  public getRules(): SentinelRule[] {
    return this.resources
      .flatMap((resource) => this.processResource(resource))
      .filter(Boolean) as SentinelRule[];
  }

  private processResource(resource: SentinelArmResource): SentinelRule | undefined {
    // Only process Scheduled analytics rules
    if (resource.kind !== 'Scheduled') {
      return undefined;
    }

    const { properties } = resource;
    if (!properties) {
      return undefined;
    }

    const { displayName, description, query, severity } = properties;

    if (!displayName || !query) {
      return undefined;
    }

    const id = resource.name ?? resource.id ?? displayName;

    return {
      id,
      displayName,
      description: description ?? '',
      query,
      severity: severity ?? 'medium',
      tactics: properties.tactics,
      techniques: properties.techniques,
    };
  }
}
