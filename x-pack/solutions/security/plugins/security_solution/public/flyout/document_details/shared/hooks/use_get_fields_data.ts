/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { getOr } from 'lodash/fp';
import type { SearchHit } from '../../../../../common/search_strategy';

/**
 * Since the fields api may return a string array as well as an object array
 * Getting the nestedPath of an object array would require first getting the top level `fields` key
 * The field api keys do not provide an index value for the original order of each object
 * for example, we might expect fields to reference kibana.alert.parameters.0.index, but the index information is represented by the array position.
 * This should be generally fine, but given the flattened nature of the top level key, utilities like `get` or `getOr` won't work since the path isn't actually nested
 * This utility allows users to not only get simple fields, but if they provide a path like `kibana.alert.parameters.index`, it will return an array of all index values
 * for each object in the parameters array. As an added note, this work stemmed from a hope to be able to purely use the fields api in place of the data produced by
 * `getDataFromFieldsHits` found in `x-pack/platform/plugins/shared/timelines/common/utils/field_formatters.ts`
 */
const getAllDotIndicesInReverse = (dotField: string): number[] => {
  const dotRegx = RegExp('[.]', 'g');
  const indicesOfAllDotsInString = [];
  let result = dotRegx.exec(dotField);
  while (result) {
    indicesOfAllDotsInString.push(result.index);
    result = dotRegx.exec(dotField);
  }
  /**
   * Put in reverse so we start look up from the most likely to be found;
   * [[kibana.alert.parameters, index], ['kibana.alert', 'parameters.index'], ['kibana', 'alert.parameters.index']]
   */
  return indicesOfAllDotsInString.reverse();
};

/**
 * We get the dot paths so we can look up each path to see if any of the nested fields exist
 * */
const getAllPotentialDotPaths = (dotField: string): string[][] => {
  const reverseDotIndices = getAllDotIndicesInReverse(dotField);

  // The nested array paths seem to be at most a tuple (i.e.: `kibana.alert.parameters`, `some.nested.parameters.field`)
  const pathTuples = reverseDotIndices.map((dotIndex: number) => {
    return [dotField.slice(0, dotIndex), dotField.slice(dotIndex + 1)];
  });

  return pathTuples;
};

/**
 * We get the nested value
 */
const getNestedValue = (startPath: string, endPath: string, data: Record<string, unknown>) => {
  const foundPrimaryPath = data[startPath];
  if (Array.isArray(foundPrimaryPath)) {
    // If the nested path points to an array of objects return the nested value of every object in the array
    return foundPrimaryPath
      .map((nestedObj) => getOr(null, endPath, nestedObj)) // TODO:QUESTION: does it make sense to leave undefined or null values as array position could be important?
      .filter((val) => val !== null);
  } else {
    // The nested path is just a nested object, so use getOr
    return getOr(undefined, endPath, foundPrimaryPath);
  }
};

/**
 * We get the field value from a fields response and by breaking down to look at each individual path,
 * we're able to get both top level fields as well as nested fields that don't provide index information.
 * In the case where a user enters kibana.alert.parameters.someField, a mapped array of the subfield value will be returned
 */
const getFieldsValue = (
  dotField: string,
  data: SearchHit['fields'] | undefined,
  cacheNestedField: (fullPath: string, value: unknown) => void
) => {
  if (!dotField || !data) return undefined;

  // If the dotField exists and is not a nested object return it
  if (Object.hasOwn(data, dotField)) return data[dotField];
  else {
    const pathTuples = getAllPotentialDotPaths(dotField);
    for (const [startPath, endPath] of pathTuples) {
      const foundPrimaryPath = Object.hasOwn(data, startPath) ? data[startPath] : null;
      if (foundPrimaryPath) {
        const nestedValue = getNestedValue(startPath, endPath, data);
        // We cache only the values that need extra work to find. This can be an array of values or a single value
        cacheNestedField(dotField, nestedValue);
        return nestedValue;
      }
    }
  }

  // Return undefined if nothing is found
  return undefined;
};

export type GetFieldsData = (field: string) => string | string[] | null | undefined;

export interface UseGetFieldsDataParams {
  /**
   * All fields from the searchHit result
   */
  fieldsData: SearchHit['fields'] | undefined;
}

export interface UseGetFieldsDataResult {
  /**
   * Retrieves the value for the provided field (reading from the searchHit result)
   */
  getFieldsData: GetFieldsData;
}

/**
 * Hook that returns a function to retrieve the values for a field (reading from the searchHit result)
 */
export const useGetFieldsData = ({
  fieldsData,
}: UseGetFieldsDataParams): UseGetFieldsDataResult => {
  // TODO: Move cache to top level container such as redux or context. Make it store type agnostic if possible
  // TODO: Handle updates where data is re-requested and the cache is reset.
  const cachedOriginalData = useMemo(() => fieldsData, [fieldsData]);
  const cachedExpensiveNestedValues: Record<string, unknown> = useMemo(() => ({}), []);

  // Speed up any lookups elsewhere by caching the field.
  const cacheNestedValues = useCallback(
    (fullPath: string, value: unknown) => {
      cachedExpensiveNestedValues[fullPath] = value;
    },
    [cachedExpensiveNestedValues]
  );

  const getFieldsData = useCallback(
    (field: string) => {
      let fieldsValue;
      // Get an expensive value from the cache if it exists, otherwise search for the value
      if (Object.hasOwn(cachedExpensiveNestedValues, field)) {
        fieldsValue = cachedExpensiveNestedValues[field];
      } else {
        fieldsValue = cachedOriginalData
          ? getFieldsValue(field, cachedOriginalData, cacheNestedValues)
          : undefined;
      }

      if (Array.isArray(fieldsValue)) {
        // Return the value if it's singular, otherwise return an expected array of values
        if (fieldsValue.length === 0) return undefined;
        else return fieldsValue;
      }
      // Otherwise return the given fieldsValue if it isn't an array
      return fieldsValue;
    },
    [cacheNestedValues, cachedExpensiveNestedValues, cachedOriginalData]
  );

  return { getFieldsData };
};
