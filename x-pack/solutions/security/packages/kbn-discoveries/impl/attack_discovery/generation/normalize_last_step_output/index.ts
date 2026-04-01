/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Represents a single column in an ES|QL result set.
 */
interface EsqlColumn {
  name: string;
  type: string;
}

/**
 * Represents an ES|QL result shape with columns and values.
 */
interface EsqlShape {
  columns: EsqlColumn[];
  values: unknown[][];
}

/**
 * Type guard that checks whether `output` has the ES|QL result shape
 * (an object with `columns` and `values` arrays).
 */
export const isEsqlShape = (output: unknown): output is EsqlShape => {
  if (output == null || typeof output !== 'object' || Array.isArray(output)) {
    return false;
  }

  const candidate = output as Record<string, unknown>;

  return Array.isArray(candidate.columns) && Array.isArray(candidate.values);
};

/**
 * Converts an ES|QL result (columns + values) to an array of CSV-formatted
 * alert strings, matching the format produced by the legacy alert retrieval
 * workflow (see `getCsvFromData`).
 *
 * Each row in the ES|QL result becomes a multi-line CSV string where:
 * - Keys are sorted alphabetically
 * - Each line is `fieldName,value1,value2,...`
 * - Multi-value fields have their values joined by commas
 * - Null / undefined values are omitted
 */
export const convertEsqlResultToAlerts = ({
  columns,
  values,
}: {
  columns: EsqlColumn[];
  values: unknown[][];
}): string[] => {
  if (!Array.isArray(columns) || !Array.isArray(values)) {
    return [];
  }

  const columnNames = columns.map((col) => col.name);

  return values.map((row) => {
    const data: Record<string, string[]> = {};

    for (let i = 0; i < columnNames.length; i++) {
      const value = i < row.length ? row[i] : null;

      if (value !== null && value !== undefined) {
        data[columnNames[i]] = Array.isArray(value) ? value.map(String) : [String(value)];
      }
    }

    return Object.keys(data)
      .sort()
      .map((key) => `${key},${data[key].join(',')}`)
      .join('\n');
  });
};

/**
 * Serializes a single element to a string:
 * - strings pass through unchanged
 * - objects are JSON-stringified
 * - everything else (numbers, booleans) is converted via String()
 */
const serializeElement = (element: unknown): string => {
  if (typeof element === 'string') {
    return element;
  }

  if (typeof element === 'object' && element !== null) {
    return JSON.stringify(element);
  }

  return String(element);
};

/**
 * Normalizes the output of the last workflow step into an array of strings.
 *
 * Handles:
 * - ES|QL shape (columns/values) -> CSV per row
 * - Array -> per-element serialization (strings pass through, objects are
 *   JSON-stringified, primitives are String()-converted)
 * - Plain object -> JSON.stringify wrapped in an array
 * - String -> wrapped in an array
 * - Number / boolean -> String()-converted and wrapped in an array
 * - null / undefined -> empty array
 */
export const normalizeLastStepOutput = (output: unknown): string[] => {
  if (output == null) {
    return [];
  }

  if (isEsqlShape(output)) {
    return convertEsqlResultToAlerts(output);
  }

  if (Array.isArray(output)) {
    return output.map(serializeElement);
  }

  if (typeof output === 'string') {
    return [output];
  }

  if (typeof output === 'object') {
    return [JSON.stringify(output)];
  }

  // number, boolean, or any other primitive
  return [String(output)];
};
