/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Reserved YARA keywords, see https://yara.readthedocs.io/en/stable/writingrules.html#table-1

export const DECLARATION_KEYWORDS = ['rule', 'private', 'global', 'import', 'include'] as const;

export const SECTION_KEYWORDS = ['meta', 'strings', 'condition'] as const;

export const STRING_MODIFIERS = [
  'nocase',
  'wide',
  'ascii',
  'xor',
  'base64',
  'base64wide',
  'fullword',
  'private',
] as const;

export const OPERATOR_KEYWORDS = [
  'and',
  'or',
  'not',
  'defined',
  'at',
  'in',
  'of',
  'for',
  'contains',
  'icontains',
  'startswith',
  'istartswith',
  'endswith',
  'iendswith',
  'iequals',
  'matches',
] as const;

export const QUANTIFIER_KEYWORDS = ['all', 'any', 'none', 'them'] as const;

export const CONSTANT_KEYWORDS = ['true', 'false'] as const;

export const BUILT_IN_KEYWORDS = [
  'filesize',
  'entrypoint',
  'int8',
  'int16',
  'int32',
  'int8be',
  'int16be',
  'int32be',
  'uint8',
  'uint16',
  'uint32',
  'uint8be',
  'uint16be',
  'uint32be',
] as const;
