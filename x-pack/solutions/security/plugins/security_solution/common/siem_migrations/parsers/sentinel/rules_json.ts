/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SentinelRule } from './types';

interface SentinelRuleProperties {
  displayName?: string;
  description?: string;
  query?: string;
  severity?: string;
  tactics?: string[];
  techniques?: string[];
  enabled?: boolean;
}

interface SentinelArmResource {
  id?: string;
  name?: string;
  kind?: string;
  type?: string;
  properties?: SentinelRuleProperties;
}

/**
 * Parses Microsoft Sentinel Analytics Rules from an ARM template JSON export.
 *
 * Supports two export formats:
 * 1. ARM template wrapper: `{ "resources": [...] }`
 * 2. Direct array of rule objects: `[...]`
 *
 * Only "Scheduled" rule kinds are extracted, as these map to detection rules.
 */
export class SentinelRulesJsonParser {
  private readonly rawJson: string;

  constructor(rawJson: string) {
    this.rawJson = rawJson;
  }

  /**
   * Parses the JSON and returns all valid Scheduled Analytics Rules.
   * @throws Error if the JSON is malformed or not a recognized Sentinel export format.
   */
  public getRules(): SentinelRule[] {
    let parsed: unknown;
    try {
      parsed = JSON.parse(this.rawJson);
    } catch (e) {
      throw new Error(`Failed to parse Sentinel JSON: ${e.message}`);
    }

    const resources = this.extractResources(parsed);
    return resources
      .flatMap((resource) => this.processResource(resource))
      .filter(Boolean) as SentinelRule[];
  }

  private extractResources(parsed: unknown): SentinelArmResource[] {
    if (Array.isArray(parsed)) {
      return parsed as SentinelArmResource[];
    }
    if (
      parsed &&
      typeof parsed === 'object' &&
      'resources' in parsed &&
      Array.isArray((parsed as { resources: unknown }).resources)
    ) {
      return (parsed as { resources: SentinelArmResource[] }).resources;
    }
    throw new Error(
      'Unrecognized Sentinel export format. Expected an ARM template with a "resources" array or a direct array of rule objects.'
    );
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
