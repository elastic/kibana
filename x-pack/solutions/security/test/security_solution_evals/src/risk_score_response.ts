/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this tool except in compliance with the Elastic License
 * 2.0.
 */

/**
 * ES|QL-style response shape (e.g. from _query or similar).
 */
export interface RiskScoreEsqlResponse {
  columns: Array<{ name: string; type: string }>;
  values: unknown[][];
}

/**
 * Flattened risk score record for a single entity.
 */
export interface RiskScoreRecord {
  id: string;
  calculated_score_norm: number;
  '@timestamp': string;
  calculated_level: string;
}

const COLUMN_TO_OUTPUT_KEY: Record<string, keyof RiskScoreRecord> = {
  '@timestamp': '@timestamp',
  'host.risk.calculated_score_norm': 'calculated_score_norm',
  'host.risk.calculated_level': 'calculated_level',
  'host.risk.id_value': 'id',
  'user.risk.calculated_score_norm': 'calculated_score_norm',
  'user.risk.calculated_level': 'calculated_level',
  'user.risk.id_value': 'id',
};

/**
 * Converts an ES|QL-style risk score response (columns + values) into an array
 * of flattened risk score records. Drops id_field and maps entity-prefixed
 * columns (e.g. host.risk.id_value) to the output shape.
 */
export const riskScoreResponseToRecords = (response: RiskScoreEsqlResponse): RiskScoreRecord[] => {
  const { columns, values } = response;
  const nameToOutputKey = new Map<string, keyof RiskScoreRecord>();

  columns.forEach((col, index) => {
    const outKey = COLUMN_TO_OUTPUT_KEY[col.name];
    if (outKey) {
      nameToOutputKey.set(col.name, outKey);
    }
  });

  return values.map((row): RiskScoreRecord => {
    const record = {} as Record<keyof RiskScoreRecord, unknown>;

    columns.forEach((col, index) => {
      const outKey = nameToOutputKey.get(col.name);
      if (outKey !== undefined) {
        const value = row[index];
        record[outKey] = value;
      }
    });

    return record as RiskScoreRecord;
  });
};
