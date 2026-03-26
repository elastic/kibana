/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ExtractedEntity, ObservableTypeKey, EntityExtractionConfig } from '../types';
import { getEcsFieldMappings } from './ecs_field_mappings';
import { validateEntity } from './entity_validators';

const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;

// Matches valid IPv6 addresses: full, compressed (::), mixed (::ffff:1.2.3.4), etc.
const IPV6_REGEX = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$|^::$|^::1$|^([0-9a-fA-F]{1,4}:){1,6}(25[0-5]|2[0-4]\d|[01]?\d\d?)(\.(25[0-5]|2[0-4]\d|[01]?\d\d?)){3}$/;

const getNestedValue = (obj: Record<string, unknown>, path: string): unknown => {
  // Check flat dotted key first (ES returns alerts with flat keys like "host.name")
  if (path in obj) return obj[path];
  // Fall back to nested traversal (for properly nested objects)
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
};

const resolveIpType = (value: string): ObservableTypeKey | null => {
  if (IPV4_REGEX.test(value)) return 'ipv4';
  if (IPV6_REGEX.test(value)) return 'ipv6';
  return null;
};

const isExcluded = (
  typeKey: ObservableTypeKey,
  value: string,
  exclusionFilters: Record<string, string[]>
): boolean => {
  const filters = exclusionFilters[typeKey];
  if (!filters) return false;
  const normalizedValue = value.toLowerCase().trim();
  return filters.some((f) => normalizedValue === f.toLowerCase());
};

const flattenValue = (value: unknown): string[] => {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.flatMap(flattenValue);
  }
  const str = String(value).trim();
  return str ? [str] : [];
};

export interface ExtractionResult {
  readonly entities: ExtractedEntity[];
  readonly stats: {
    readonly totalFields: number;
    readonly fieldsWithValues: number;
    readonly entitiesExtracted: number;
    readonly entitiesAfterDedup: number;
  };
}

/**
 * Extracts observable entities from alert documents using ECS field mappings.
 * Supports configurable exclusion filters and IP version detection.
 */
const DEFAULT_ENTITY_EXTRACTION_CONFIG: EntityExtractionConfig = {
  enabled: true,
  exclusionFilters: {},
};

export const extractEntitiesFromAlerts = ({
  alerts,
  config = DEFAULT_ENTITY_EXTRACTION_CONFIG,
  logger,
}: {
  alerts: Array<{ _id: string; _source: Record<string, unknown> }>;
  config?: EntityExtractionConfig;
  logger: Logger;
}): ExtractionResult => {
  const mappings = getEcsFieldMappings();
  const allEntities: ExtractedEntity[] = [];
  let totalFields = 0;
  let fieldsWithValues = 0;
  let invalidEntitiesFiltered = 0;

  for (const alert of alerts) {
    for (const mapping of mappings) {
      totalFields++;
      const rawValue = getNestedValue(alert._source, mapping.ecsField);
      const values = flattenValue(rawValue);

      if (values.length > 0) {
        fieldsWithValues++;

        for (const value of values) {
          const typeKey = mapping.detectIpVersion ? resolveIpType(value) : mapping.observableType;

          // If detectIpVersion is set but value isn't a valid IP, skip it
          if (typeKey == null) {
            invalidEntitiesFiltered++;
            logger.debug(
              () =>
                `Filtered non-IP value: "${value}" from ${mapping.ecsField} (alert ${alert._id})`
            );
            continue;
          }

          // Validate entity before adding (prevents malformed data)
          if (!validateEntity(typeKey, value)) {
            invalidEntitiesFiltered++;
            logger.debug(
              () =>
                `Filtered invalid ${typeKey} entity: "${value}" from ${mapping.ecsField} (alert ${alert._id})`
            );
            continue;
          }

          if (!isExcluded(typeKey, value, config.exclusionFilters)) {
            allEntities.push({
              typeKey,
              value,
              sourceField: mapping.ecsField,
              alertId: alert._id,
            });
          }
        }
      }
    }
  }

  if (invalidEntitiesFiltered > 0) {
    logger.info(`Filtered ${invalidEntitiesFiltered} invalid entities during extraction`);
  }

  // Deduplicate per-alert: same entity value within one alert is redundant,
  // but the same entity across different alerts must be preserved for case matching
  const seen = new Set<string>();
  const dedupedEntities: ExtractedEntity[] = [];
  for (const entity of allEntities) {
    const key = `${entity.alertId}::${entity.typeKey}::${entity.value.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      dedupedEntities.push(entity);
    }
  }

  logger.debug(
    () =>
      `extractEntitiesFromAlerts: extracted ${allEntities.length} entities from ${alerts.length} alerts, ${dedupedEntities.length} unique after dedup`
  );

  return {
    entities: dedupedEntities,
    stats: {
      totalFields,
      fieldsWithValues,
      entitiesExtracted: allEntities.length,
      entitiesAfterDedup: dedupedEntities.length,
    },
  };
};
