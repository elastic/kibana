/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Important:
 * This library uses regular expressions that are executed against arbitrary user input, they need to be safe from ReDoS attacks.
 * Please make sure to test all regular expressions them before using them.
 * At the time of writing, this tool can be used to test it: https://devina.io/redos-checker
 */
import type { RuleMigrationResourceBase } from '../../../model/rule_migration.gen';
import type { ResourceIdentifier } from '../types';

const lookupRegex = /\b(?:lookup)\s+([\w-]+)\b/g; // Captures only the lookup name
const macrosRegex = /`([\w-]+)(?:\(([^`]*?)\))?`/g; // Captures only the macro name and arguments

export const splResourceIdentifier: ResourceIdentifier = (input) => {
  // sanitize the query to avoid mismatching macro and lookup names inside comments or literal strings
  const sanitizedInput = sanitizeInput(input);

  const resources: RuleMigrationResourceBase[] = [];
  let macroMatch;
  while ((macroMatch = macrosRegex.exec(sanitizedInput)) !== null) {
    const macroName = macroMatch[1] as string;
    const args = macroMatch[2] as string; // This captures the content inside the parentheses
    const argCount = args ? args.split(',').length : 0; // Count arguments if present
    const macroWithArgs = argCount > 0 ? `${macroName}(${argCount})` : macroName;
    resources.push({ type: 'macro', name: macroWithArgs });
  }

  let lookupMatch;
  while ((lookupMatch = lookupRegex.exec(sanitizedInput)) !== null) {
    resources.push({ type: 'lookup', name: lookupMatch[1].replace(/_lookup$/, '') });
  }

  return resources;
};

// Comments should be removed before processing the query to avoid matching macro and lookup names inside them
const commentRegex = /```.*?```/g;
// Literal strings should be replaced with a placeholder to avoid matching macro and lookup names inside them
const doubleQuoteStrRegex = /".*?"/g;
const singleQuoteStrRegex = /'.*?'/g;
// lookup operator can have modifiers like local=true or update=false before the lookup name, we need to remove them
const lookupModifiers = /\blookup\b\s+((local|update)=\s*(?:true|false)\s*)+/gi;

const sanitizeInput = (query: string) => {
  return query
    .replaceAll(commentRegex, '')
    .replaceAll(doubleQuoteStrRegex, '"literal"')
    .replaceAll(singleQuoteStrRegex, "'literal'")
    .replaceAll(lookupModifiers, 'lookup ');
};
