/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const EXECUTION_CONFIG = {
  RESPONSE_SIZE_BUDGET: 6000,
  TRUNCATION_THRESHOLD: 0.75,
} as const;

/**
 * Truncates a JSON response to fit within a size budget (in characters).
 * Keeps the first N items of arrays and fields of objects until size limit is reached.
 * Adds _truncation_info markers to indicate what was removed.
 */
export const truncateJsonResponse = (
  obj: unknown,
  maxSize: number = EXECUTION_CONFIG.RESPONSE_SIZE_BUDGET
): unknown => {
  const processValue = (
    value: unknown,
    remainingBudget: number
  ): { value: unknown; size: number } => {
    // Primitives: return as-is
    if (value === null || typeof value !== 'object') {
      const str = JSON.stringify(value);
      return { value, size: str.length };
    }

    // Arrays: keep first N items, add truncation info if needed
    if (Array.isArray(value)) {
      const result: unknown[] = [];
      let size = 0;

      for (let i = 0; i < value.length; i++) {
        if (size > remainingBudget * EXECUTION_CONFIG.TRUNCATION_THRESHOLD) {
          // Size limit approaching, add truncation marker and stop
          if (i < value.length) {
            result.push({
              _truncation_info: {
                type: 'array',
                shown: result.length,
                total: value.length,
                remaining: value.length - result.length,
              },
            });
          }
          break;
        }

        const { value: processedItem, size: itemSize } = processValue(
          value[i],
          remainingBudget - size
        );
        result.push(processedItem);
        size += itemSize;
      }

      return { value: result, size };
    }

    // Objects: keep fields until size limit is reached
    const result: Record<string, unknown> = {};
    const entries = Object.entries(value as Record<string, unknown>);
    let size = 0;
    let fieldsProcessed = 0;

    for (const [key, val] of entries) {
      if (size > remainingBudget) {
        // Size limit approaching, add truncation marker and stop
        const remainingFields = entries.length - fieldsProcessed;
        if (remainingFields > 0) {
          result._truncation_info = {
            type: 'object',
            fields_shown: fieldsProcessed,
            fields_total: entries.length,
            fields_remaining: remainingFields,
          };
        }
        break;
      }

      const { value: processedVal, size: valSize } = processValue(val, remainingBudget - size);
      result[key] = processedVal;
      size += key.length + valSize;
      fieldsProcessed++;
    }

    return { value: result, size };
  };

  const { value } = processValue(obj, maxSize);
  return value;
};
