/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';

import { ALERT_RULE_PARAMETERS } from '@kbn/rule-data-utils';
import type { EcsFieldMap } from '@kbn/rule-registry-plugin/common/assets/field_maps/ecs_field_map';
import { ecsFieldMap } from '@kbn/rule-registry-plugin/common/assets/field_maps/ecs_field_map';
import type { TechnicalRuleFieldMap } from '@kbn/rule-registry-plugin/common/assets/field_maps/technical_rule_field_map';
import { technicalRuleFieldMap } from '@kbn/rule-registry-plugin/common/assets/field_maps/technical_rule_field_map';
import type { ExperimentalRuleFieldMap } from '@kbn/alerts-as-data-utils';
import { legacyExperimentalFieldMap } from '@kbn/alerts-as-data-utils';
import type { Fields, TimelineEventsDetailsItem } from '../search_strategy';
import { toObjectArrayOfStrings, toStringArray } from './to_array';
import { ENRICHMENT_DESTINATION_PATH } from '../constants';

export const baseCategoryFields = ['@timestamp', 'labels', 'message', 'tags'];
const nonFlattenedFormatParamsFields = ['related_integrations', 'threat_mapping'];

export const getFieldCategory = (field: string): string => {
  const fieldCategory = field.split('.')[0];
  if (!isEmpty(fieldCategory) && baseCategoryFields.includes(fieldCategory)) {
    return 'base';
  }
  return fieldCategory;
};

export const formatGeoLocation = (item: unknown[]) => {
  const itemGeo = item.length > 0 ? (item[0] as { coordinates: number[] }) : null;
  if (itemGeo != null && !isEmpty(itemGeo.coordinates)) {
    try {
      return toStringArray({
        lon: itemGeo.coordinates[0],
        lat: itemGeo.coordinates[1],
      });
    } catch {
      return toStringArray(item);
    }
  }
  return toStringArray(item);
};

export const isGeoField = (field: string) =>
  field.includes('geo.location') || field.includes('geoip.location');

export const isRuleParametersFieldOrSubfield = (field: string, prependField?: string) =>
  (prependField?.includes(ALERT_RULE_PARAMETERS) || field === ALERT_RULE_PARAMETERS) &&
  !nonFlattenedFormatParamsFields.includes(field);

// threat.enrichments is a nested type, excluded from ecsFieldMap to prevent mapping conflicts.
// We must handle it specially to ensure enrichment data still displays correctly in the UI.
const KNOWN_THREAT_ENRICHMENT_SUBFIELDS = ['indicator', 'matched'];

export const isThreatEnrichmentFieldOrSubfield = (field: string, prependField?: string) => {
  // Build the full dotted path
  const dotField = prependField ? `${prependField}.${field}` : field;
  // Check if this is the threat.enrichments field itself or a subfield of it
  return (
    dotField === ENRICHMENT_DESTINATION_PATH ||
    dotField.startsWith(`${ENRICHMENT_DESTINATION_PATH}.`)
  );
};

// Helper functions
const createFieldItem = (
  fieldCategory: string,
  field: string,
  values: string[],
  isObjectArray: boolean
): TimelineEventsDetailsItem => ({
  category: fieldCategory,
  field,
  values,
  originalValue: values,
  isObjectArray,
});

const processGeoField = (
  field: string,
  item: unknown[],
  fieldCategory: string
): TimelineEventsDetailsItem => {
  const formattedLocation = formatGeoLocation(item);
  return createFieldItem(fieldCategory, field, formattedLocation, true);
};

const processSimpleField = (
  dotField: string,
  strArr: string[],
  isObjectArray: boolean,
  fieldCategory: string
): TimelineEventsDetailsItem => createFieldItem(fieldCategory, dotField, strArr, isObjectArray);

const processNestedFields = (
  item: unknown,
  dotField: string,
  fieldCategory: string,
  prependDotField: boolean
): TimelineEventsDetailsItem[] => {
  if (Array.isArray(item)) {
    return item.flatMap((curr) =>
      getDataFromFieldsHits(curr as Fields, prependDotField ? dotField : undefined, fieldCategory)
    );
  }

  return getDataFromFieldsHits(
    item as Fields,
    prependDotField ? dotField : undefined,
    fieldCategory
  );
};

type DisjointFieldNames = 'ecs.version' | 'event.action' | 'event.kind' | 'event.original' | 'tags';

// Memoized field maps
const fieldMaps: EcsFieldMap &
  Omit<TechnicalRuleFieldMap, DisjointFieldNames> &
  ExperimentalRuleFieldMap = {
  ...technicalRuleFieldMap,
  ...ecsFieldMap,
  ...legacyExperimentalFieldMap,
};

export const getDataFromFieldsHits = (
  fields: Fields,
  prependField?: string,
  prependFieldCategory?: string
): TimelineEventsDetailsItem[] => {
  const resultMap = new Map<string, TimelineEventsDetailsItem>();
  const fieldNames = Object.keys(fields);
  for (let i = 0; i < fieldNames.length; i++) {
    const field = fieldNames[i];
    const item: unknown[] = fields[field];
    const fieldCategory = prependFieldCategory ?? getFieldCategory(field);
    const dotField = prependField ? `${prependField}.${field}` : field;

    // Handle geo fields
    if (isGeoField(field)) {
      const geoItem = processGeoField(field, item, fieldCategory);
      resultMap.set(field, geoItem);
      // eslint-disable-next-line no-continue
      continue;
    }

    const objArrStr = toObjectArrayOfStrings(item);
    const strArr = objArrStr.map(({ str }) => str);
    const isObjectArray = objArrStr.some((o) => o.isObjectArray);

    const isEcsField = fieldMaps[field as keyof typeof fieldMaps] !== undefined;
    const isRuleParameters = isRuleParametersFieldOrSubfield(field, prependField);
    const isThreatEnrichment = isThreatEnrichmentFieldOrSubfield(field, prependField);

    // Handle simple fields - but don't treat threat enrichments as simple fields
    // even if they're not in ecsFieldMap (they were excluded as nested type)
    if (!isObjectArray || (!isEcsField && !isRuleParameters && !isThreatEnrichment)) {
      const simpleItem = processSimpleField(dotField, strArr, isObjectArray, fieldCategory);
      resultMap.set(dotField, simpleItem);
      // eslint-disable-next-line no-continue
      continue;
    }

    // Handle threat enrichment - add the stringified value first
    if (isThreatEnrichment) {
      const enrichmentItem = createFieldItem(fieldCategory, dotField, strArr, isObjectArray);
      resultMap.set(dotField, enrichmentItem);

      // For threat enrichment subfields, only recurse into known ECS subfields (indicator, matched).
      // Custom fields stay JSON-stringified to prevent over-flattening.
      // Note: We can't use ecsFieldMap here because all threat.enrichments.* fields are excluded
      // from ecsFieldMap (they're children of a nested type).
      if (dotField !== ENRICHMENT_DESTINATION_PATH) {
        // This is a subfield of threat.enrichments - check if it's a known ECS subfield
        const isKnownThreatEnrichmentSubfield = KNOWN_THREAT_ENRICHMENT_SUBFIELDS.includes(field);
        if (!isKnownThreatEnrichmentSubfield) {
          // Don't recurse into custom/unknown fields like "lazer"
          // eslint-disable-next-line no-continue
          continue;
        }
      }
      // For threat.enrichments itself, always recurse to process its children
    }

    // Process nested fields
    const nestedFields = processNestedFields(
      item,
      dotField,
      fieldCategory,
      isRuleParameters || isThreatEnrichment
    );
    // Merge results
    for (const nestedItem of nestedFields) {
      const existing = resultMap.get(nestedItem.field);

      if (!existing) {
        resultMap.set(nestedItem.field, nestedItem);
        // eslint-disable-next-line no-continue
        continue;
      }

      // Merge values and originalValue arrays
      const mergedValues = existing.values?.includes(nestedItem.values?.[0] || '')
        ? existing.values
        : [...(existing.values || []), ...(nestedItem.values || [])];

      const mergedOriginal = existing.originalValue.includes(nestedItem.originalValue[0])
        ? existing.originalValue
        : [...existing.originalValue, ...nestedItem.originalValue];

      resultMap.set(nestedItem.field, {
        ...nestedItem,
        values: mergedValues,
        originalValue: mergedOriginal,
      });
    }
  }

  return Array.from(resultMap.values());
};
