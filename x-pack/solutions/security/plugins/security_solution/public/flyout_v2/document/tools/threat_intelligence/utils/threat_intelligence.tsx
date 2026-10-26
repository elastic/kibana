/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isObject } from 'lodash';
import { i18n } from '@kbn/i18n';
import type { ThreatDetailsRow } from '../components/threat_details_view_enrichment_accordion';
import type { CtiEnrichment } from '../../../../../../common/search_strategy';
import { DEFAULT_INDICATOR_SOURCE_PATH } from '../../../../../../common/constants';
import {
  ENRICHMENT_TYPES,
  FEED_NAME,
  FIRST_SEEN,
  MATCHED_ATOMIC,
  MATCHED_FIELD,
  MATCHED_ID,
  MATCHED_TYPE,
} from '../../../../../../common/cti/constants';

const NESTED_OBJECT_VALUES_NOT_RENDERED = i18n.translate(
  'xpack.securitySolution.flyout.threatIntelligence.investigationEnrichmentObjectValuesNotRendered',
  {
    defaultMessage:
      'This field contains nested object values, which are not rendered here. See the full document for all fields/values',
  }
);

/**
 *  Retrieves the first element of the given array.
 *
 * @param array the array to retrieve a value from
 * @returns the first element of the array, or undefined if the array is undefined
 */
const getFirstElement: <T = unknown>(array: T[] | undefined) => T | undefined = (array) =>
  array ? array[0] : undefined;

/**
 * Returns true if the enrichment type is 'investigation_time'
 */
export const isInvestigationTimeEnrichment = (type: string | undefined): boolean =>
  type === ENRICHMENT_TYPES.InvestigationTime;

/**
 * Extracts the first value from an enrichment field
 */
export const getEnrichmentValue = (enrichment: CtiEnrichment, field: string) =>
  getFirstElement(enrichment[field]) as string | undefined;

/**
 * These fields (e.g. 'indicator.ip') may be in one of three places depending on whether it's:
 *   * a queried, legacy filebeat indicator ('threatintel.indicator.ip')
 *   * a queried, ECS 1.11 filebeat indicator ('threat.indicator.ip')
 *   * an existing indicator from an enriched alert ('indicator.ip')
 */
export const getShimmedIndicatorValue = (enrichment: CtiEnrichment, field: string) =>
  getEnrichmentValue(enrichment, field) ||
  getEnrichmentValue(enrichment, `threatintel.${field}`) ||
  getEnrichmentValue(enrichment, `threat.${field}`);

/**
 * Extracts the identifiers from an enrichment
 */
export const getEnrichmentIdentifiers = (
  enrichment: CtiEnrichment
): {
  id: string | undefined;
  field: string | undefined;
  value: string | undefined;
  type: string | undefined;
  feedName: string | undefined;
} => ({
  id: getEnrichmentValue(enrichment, MATCHED_ID),
  field: getEnrichmentValue(enrichment, MATCHED_FIELD),
  value: getEnrichmentValue(enrichment, MATCHED_ATOMIC),
  type: getEnrichmentValue(enrichment, MATCHED_TYPE),
  feedName: getShimmedIndicatorValue(enrichment, FEED_NAME),
});

/**
 * Returns the first seen date from the enrichment
 */
export const getFirstSeen = (enrichment: CtiEnrichment): number => {
  const firstSeenValue = getShimmedIndicatorValue(enrichment, FIRST_SEEN);
  const firstSeenDate = Date.parse(firstSeenValue ?? 'no date');
  return Number.isInteger(firstSeenDate) ? firstSeenDate : new Date(-1).valueOf();
};

/**
 * Builds the threat details items for the summary table
 */
export const buildThreatDetailsItems = (enrichment: CtiEnrichment): ThreatDetailsRow[] =>
  Object.keys(enrichment)
    .sort()
    .map((field) => {
      const title = field.startsWith(DEFAULT_INDICATOR_SOURCE_PATH)
        ? field.replace(`${DEFAULT_INDICATOR_SOURCE_PATH}`, 'indicator')
        : field;

      // Gather string values, ignoring nested objects/arrays
      // TODO We should probably enhance this in the future to show all values, but
      //  this will require more involved UI changes (like show a table or json view similar to the flyout)
      const values: string[] = [];
      const enrichmentValues = enrichment[field];
      enrichmentValues.forEach((enrichmentValue) => {
        // We show the string values as is, but for nested objects we show a message indicating
        // that those values are not rendered here
        if (typeof enrichmentValue === 'string') {
          values.push(enrichmentValue);
        } else if (typeof enrichmentValue === 'number') {
          values.push(String(enrichmentValue));
        } else if (isObject(enrichmentValue)) {
          // We don't need to add the message more than once
          if (!values.includes(NESTED_OBJECT_VALUES_NOT_RENDERED)) {
            values.push(NESTED_OBJECT_VALUES_NOT_RENDERED);
          }
        }
      });

      return { title, description: { fieldName: field, value: values as string[] } };
    });
