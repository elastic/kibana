/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupBy, isObject } from 'lodash';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { CtiEnrichment, EventFields } from '../../../../../../common/search_strategy';
import { isValidEventField } from '../../../../../../common/search_strategy';
import { ENRICHMENT_DESTINATION_PATH } from '../../../../../../common/constants';
import { ENRICHMENT_TYPES, MATCHED_TYPE } from '../../../../../../common/cti/constants';

const getFirstElement: <T = unknown>(array: T[] | undefined) => T | undefined = (array) =>
  array ? array[0] : undefined;

const getFirstValue = (value: unknown): unknown =>
  Array.isArray(value) ? getFirstElement(value) : value;

const getMatchedType = (enrichment: CtiEnrichment): string | undefined =>
  getFirstElement(enrichment[MATCHED_TYPE]) as string | undefined;

const isInvestigationTimeEnrichment = (type: string | undefined): boolean =>
  type === ENRICHMENT_TYPES.InvestigationTime;

/**
 * Parses existing enrichments from the hit data.
 */
export const parseExistingEnrichments = (hit: DataTableRecord): CtiEnrichment[] => {
  const existingEnrichmentField = hit.flattened[ENRICHMENT_DESTINATION_PATH];
  if (existingEnrichmentField == null) {
    return [];
  }

  const enrichments = Array.isArray(existingEnrichmentField)
    ? existingEnrichmentField
    : [existingEnrichmentField];

  return enrichments.reduce<CtiEnrichment[]>((acc, enrichment) => {
    const parsedEnrichment =
      typeof enrichment === 'string'
        ? (() => {
            try {
              return JSON.parse(enrichment);
            } catch {
              return null;
            }
          })()
        : enrichment;

    if (!isObject(parsedEnrichment)) {
      return acc;
    }

    const normalizedEnrichment = Object.entries(parsedEnrichment).reduce<CtiEnrichment>(
      (normalized, [field, value]) => {
        if (value != null) {
          normalized[field] = Array.isArray(value) ? value : [value];
        }
        return normalized;
      },
      {}
    );

    acc.push(normalizedEnrichment);
    return acc;
  }, []);
};

/**
 * Returns a string composed of the id and the field for the enrichment.
 */
export const buildEnrichmentId = (enrichment: CtiEnrichment): string => {
  const id = getFirstElement(enrichment['matched.id']);
  const field = getFirstElement(enrichment['matched.field']);
  return `${id}${field}`;
};

/**
 * Receives an array of enrichments and removes investigation-time enrichments
 * if that exact indicator already exists elsewhere in the list.
 */
export const filterDuplicateEnrichments = (enrichments: CtiEnrichment[]): CtiEnrichment[] => {
  if (enrichments.length < 2) {
    return enrichments;
  }
  const enrichmentsById = groupBy(enrichments, buildEnrichmentId);

  return Object.values(enrichmentsById).map(
    (enrichmentGroup) =>
      enrichmentGroup.find(
        (enrichment) => !isInvestigationTimeEnrichment(getMatchedType(enrichment))
      ) ?? enrichmentGroup[0]
  );
};

/**
 * Returns event fields from the hit.
 */
export const getEnrichmentFields = (hit: DataTableRecord): EventFields =>
  Object.entries(hit.flattened).reduce<EventFields>((fields, [field, flattenedValue]) => {
    if (isValidEventField(field)) {
      const value = getFirstValue(flattenedValue);
      if (value) {
        return { ...fields, [field]: value };
      }
    }
    return fields;
  }, {});
