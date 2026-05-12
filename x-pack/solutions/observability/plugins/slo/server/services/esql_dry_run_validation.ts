/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, Logger } from '@kbn/core/server';

interface EsqlDryRunParams {
  esqlQuery: string;
  groupBy?: string[];
}

interface ValidationError {
  code: 'SYNTAX_ERROR' | 'MISSING_COLUMN' | 'TYPE_MISMATCH' | 'GROUP_BY_MISMATCH';
  message: string;
}

interface DryRunResult {
  valid: boolean;
  errors: ValidationError[];
  columns?: Array<{ name: string; type: string }>;
}

const REQUIRED_COLUMNS = ['@timestamp', 'numerator', 'denominator'];
const EXPECTED_TYPES: Record<string, string[]> = {
  '@timestamp': ['date'],
  numerator: ['long', 'integer', 'double', 'float', 'unsigned_long'],
  denominator: ['long', 'integer', 'double', 'float', 'unsigned_long'],
};

export class EsqlDryRunValidation {
  constructor(private scopedClusterClient: IScopedClusterClient, private logger: Logger) {}

  public async execute(params: EsqlDryRunParams): Promise<DryRunResult> {
    const errors: ValidationError[] = [];

    // Execute the ESQL query against a short time range to validate syntax and column output
    let columns: Array<{ name: string; type: string }>;
    try {
      const response = await this.scopedClusterClient.asCurrentUser.esql.query({
        query: params.esqlQuery,
        format: 'json',
        filter: {
          range: {
            '@timestamp': {
              gte: 'now-5m',
              lt: 'now',
            },
          },
        },
      });

      columns = (response.columns ?? []).map((col) => ({
        name: String(col.name),
        type: String(col.type),
      }));
    } catch (err) {
      this.logger.debug(`ESQL dry-run query failed: ${err.message}`);
      return {
        valid: false,
        errors: [
          {
            code: 'SYNTAX_ERROR',
            message: err.meta?.body?.error?.reason ?? err.message,
          },
        ],
      };
    }

    const columnNames = columns.map((c) => c.name);
    const columnsByName = new Map(columns.map((c) => [c.name, c]));

    // Validate required columns exist
    for (const required of REQUIRED_COLUMNS) {
      if (!columnNames.includes(required)) {
        errors.push({
          code: 'MISSING_COLUMN',
          message: `Required column '${required}' is missing from the ESQL query results. The query must produce columns: ${REQUIRED_COLUMNS.join(
            ', '
          )}`,
        });
      }
    }

    // Validate column types for present required columns
    for (const [colName, expectedTypes] of Object.entries(EXPECTED_TYPES)) {
      const col = columnsByName.get(colName);
      if (col && !expectedTypes.includes(col.type)) {
        errors.push({
          code: 'TYPE_MISMATCH',
          message: `Column '${colName}' has type '${
            col.type
          }', expected one of: ${expectedTypes.join(', ')}`,
        });
      }
    }

    // Validate groupBy columns match
    if (params.groupBy && params.groupBy.length > 0) {
      const extraColumns = columnNames.filter((name) => !REQUIRED_COLUMNS.includes(name));
      for (const groupByField of params.groupBy) {
        if (!extraColumns.includes(groupByField)) {
          errors.push({
            code: 'GROUP_BY_MISMATCH',
            message: `GroupBy field '${groupByField}' is not present in the ESQL query result columns. Available extra columns: ${
              extraColumns.length > 0 ? extraColumns.join(', ') : '(none)'
            }`,
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      columns,
    };
  }
}
