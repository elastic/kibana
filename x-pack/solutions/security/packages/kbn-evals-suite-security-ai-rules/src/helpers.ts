/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReferenceRule } from '../datasets/sample_rules';

/**
 * Extract the category from a rule name
 * e.g., "credential_access_lsass_handle" -> "credential_access"
 */
export function extractCategory(ruleName: string): string {
  const parts = ruleName.toLowerCase().split('_');
  if (parts.length >= 2) {
    // Common patterns: category_subcategory_details
    const potentialCategory = parts[0];
    const potentialSubcategory = parts[1];
    
    // Handle two-word categories
    const twoWordCategories = ['credential', 'defense', 'command', 'privilege'];
    if (twoWordCategories.includes(potentialCategory)) {
      return `${potentialCategory}_${potentialSubcategory}`;
    }
    
    return potentialCategory;
  }
  return 'unknown';
}

/**
 * Normalize query strings for comparison
 * Removes extra whitespace, normalizes line breaks
 */
export function normalizeQuery(query: string): string {
  return query
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n/g, ' ') // Replace newlines with spaces
    .replace(/\r/g, '') // Remove carriage returns
    .trim();
}

/**
 * Extract MITRE ATT&CK techniques from a rule
 */
export function extractMitreTechniques(
  rule: Partial<ReferenceRule>
): Set<string> {
  const techniques = new Set<string>();
  
  if (rule.threat) {
    for (const threat of rule.threat) {
      if (threat.technique) {
        techniques.add(threat.technique);
      }
    }
  }
  
  return techniques;
}

/**
 * Basic ESQL syntax validation
 * Checks for common syntax patterns and keywords
 */
export function validateEsqlSyntax(query: string): { valid: boolean; error?: string } {
  if (!query || query.trim().length === 0) {
    return { valid: false, error: 'Query is empty' };
  }

  const normalizedQuery = query.toLowerCase().trim();

  // Check for valid query types
  const validQueryTypes = ['process', 'network', 'file', 'registry', 'dns', 'sequence'];
  const hasValidQueryType = validQueryTypes.some((type) => normalizedQuery.startsWith(type));

  if (!hasValidQueryType) {
    return {
      valid: false,
      error: `Query must start with a valid query type: ${validQueryTypes.join(', ')}`,
    };
  }

  // Check for basic 'where' clause (most queries should have one)
  if (!normalizedQuery.includes('where')) {
    return {
      valid: false,
      error: 'Query should contain a WHERE clause',
    };
  }

  // Check for balanced parentheses
  let parenCount = 0;
  for (const char of query) {
    if (char === '(') parenCount++;
    if (char === ')') parenCount--;
    if (parenCount < 0) {
      return { valid: false, error: 'Unbalanced parentheses: too many closing parens' };
    }
  }
  if (parenCount !== 0) {
    return { valid: false, error: 'Unbalanced parentheses: unclosed parens' };
  }

  // Check for balanced quotes
  const singleQuoteCount = (query.match(/'/g) || []).length;
  const doubleQuoteCount = (query.match(/"/g) || []).length;
  
  if (singleQuoteCount % 2 !== 0) {
    return { valid: false, error: 'Unbalanced single quotes' };
  }
  if (doubleQuoteCount % 2 !== 0) {
    return { valid: false, error: 'Unbalanced double quotes' };
  }

  return { valid: true };
}

/**
 * Calculate precision, recall, and F1 score for set comparison
 */
export function calculateSetMetrics<T>(
  predicted: Set<T>,
  expected: Set<T>
): { precision: number; recall: number; f1: number } {
  if (predicted.size === 0 && expected.size === 0) {
    return { precision: 1.0, recall: 1.0, f1: 1.0 };
  }
  
  if (predicted.size === 0) {
    return { precision: 0, recall: 0, f1: 0 };
  }
  
  if (expected.size === 0) {
    return { precision: 0, recall: 0, f1: 0 };
  }
  
  const truePositives = [...predicted].filter((x) => expected.has(x)).length;
  
  const precision = truePositives / predicted.size;
  const recall = truePositives / expected.size;
  
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  
  return { precision, recall, f1 };
}

/**
 * Check if a rule has all required fields
 */
export function hasRequiredFields(rule: Partial<ReferenceRule>): {
  hasAll: boolean;
  coverage: number;
  missing: string[];
} {
  const requiredFields = ['name', 'description', 'query', 'severity', 'tags'];
  const missing: string[] = [];
  
  for (const field of requiredFields) {
    if (!rule[field as keyof ReferenceRule] || 
        (Array.isArray(rule[field as keyof ReferenceRule]) && 
         (rule[field as keyof ReferenceRule] as unknown[]).length === 0)) {
      missing.push(field);
    }
  }
  
  const coverage = (requiredFields.length - missing.length) / requiredFields.length;
  
  return {
    hasAll: missing.length === 0,
    coverage,
    missing,
  };
}
