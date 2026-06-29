/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface EsqlColumn {
  name: string;
  type: string;
}

interface EsqlShape {
  columns: EsqlColumn[];
  values: unknown[][];
}

export const isEsqlShape = (output: unknown): output is EsqlShape => {
  if (output == null || typeof output !== 'object' || Array.isArray(output)) {
    return false;
  }

  const candidate = output as Record<string, unknown>;

  return Array.isArray(candidate.columns) && Array.isArray(candidate.values);
};

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

const serializeElement = (element: unknown): string => {
  if (typeof element === 'string') {
    return element;
  }

  if (typeof element === 'object' && element !== null) {
    return JSON.stringify(element);
  }

  return String(element);
};

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

  return [String(output)];
};
