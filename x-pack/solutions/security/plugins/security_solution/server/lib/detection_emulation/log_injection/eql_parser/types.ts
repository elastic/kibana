/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Lightweight EQL parser for detection emulation.
 *
 * Parses EQL queries into an AST so the rule query inverter can extract
 * field constraints and generate matching ECS documents. This is NOT a
 * full EQL evaluator — it only needs to understand the structural shape
 * of queries, not execute them.
 *
 * Grammar subset (from elasticsearch EqlBase.g4):
 *   statement     = query pipe*
 *   query         = sequence | eventQuery
 *   sequence      = 'sequence' [joinKeys] [sequenceParams] sequenceTerm+
 *                     ['until' sequenceTerm]
 *   sequenceParams = 'with' 'maxspan' '=' timeUnit
 *   sequenceTerm  = '[' eventFilter ']' [joinKeys]
 *   eventQuery    = eventFilter
 *   eventFilter   = eventCategory 'where' expression
 *   joinKeys      = 'by' expression (',' expression)*
 *
 * Expression parsing covers: comparisons (==, !=, <, >, <=, >=),
 * wildcard match (:), boolean operators (and, or, not), in/not in,
 * like/regex predicates, function calls, arithmetic, and parenthesized
 * sub-expressions.
 */

// ─── Token types ───────────────────────────────────────────────

export enum TokenType {
  // Literals
  Identifier = 'Identifier',
  String = 'String',
  Number = 'Number',
  Boolean = 'Boolean',
  Null = 'Null',

  // Keywords
  Sequence = 'Sequence',
  Sample = 'Sample',
  Join = 'Join',
  By = 'By',
  With = 'With',
  Maxspan = 'Maxspan',
  Until = 'Until',
  Where = 'Where',
  And = 'And',
  Or = 'Or',
  Not = 'Not',
  In = 'In',
  InInsensitive = 'InInsensitive',
  Like = 'Like',
  LikeInsensitive = 'LikeInsensitive',
  Regex = 'Regex',
  RegexInsensitive = 'RegexInsensitive',
  Seq = 'Seq',
  Of = 'Of',
  Any = 'Any',

  // Operators
  Eq = 'Eq', // ==
  Neq = 'Neq', // !=
  Lt = 'Lt',
  Lte = 'Lte',
  Gt = 'Gt',
  Gte = 'Gte',
  Colon = 'Colon', // : (wildcard match)
  Assign = 'Assign', // =

  // Delimiters
  LParen = 'LParen',
  RParen = 'RParen',
  LBracket = 'LBracket',
  RBracket = 'RBracket',
  Comma = 'Comma',
  Dot = 'Dot',
  Pipe = 'Pipe',

  // Arithmetic
  Plus = 'Plus',
  Minus = 'Minus',
  Star = 'Star',
  Slash = 'Slash',
  Percent = 'Percent',

  // Special
  Wildcard = 'Wildcard', // *
  EOF = 'EOF',
}

export interface Token {
  type: TokenType;
  value: string;
  position: number;
}

// ─── AST node types ────────────────────────────────────────────

export type EqlAst = SequenceQuery | EventQuery;

export interface SequenceQuery {
  type: 'sequence';
  joinKeys: string[]; // top-level 'by' fields
  maxspan?: string; // e.g. '10m', '5s'
  terms: SequenceTerm[];
  until?: SequenceTerm;
}

export interface SequenceTerm {
  type: 'sequence_term';
  eventCategory: string; // e.g. 'process', 'file', 'any'
  condition: Expression;
  joinKeys: string[]; // per-term 'by' fields
}

export interface EventQuery {
  type: 'event_query';
  eventCategory: string;
  condition: Expression;
}

// Expression AST
export type Expression =
  | BinaryExpression
  | UnaryExpression
  | ComparisonExpression
  | WildcardMatchExpression
  | InExpression
  | LikeExpression
  | FunctionCallExpression
  | FieldReference
  | LiteralExpression;

export interface BinaryExpression {
  type: 'binary';
  operator: 'and' | 'or' | '+' | '-' | '*' | '/' | '%';
  left: Expression;
  right: Expression;
}

export interface UnaryExpression {
  type: 'unary';
  operator: 'not' | '-' | '+';
  operand: Expression;
}

export interface ComparisonExpression {
  type: 'comparison';
  operator: '==' | '!=' | '<' | '<=' | '>' | '>=';
  left: Expression;
  right: Expression;
}

export interface WildcardMatchExpression {
  type: 'wildcard_match';
  field: Expression;
  value: Expression;
}

export interface InExpression {
  type: 'in';
  negated: boolean;
  caseInsensitive: boolean;
  value: Expression;
  list: Expression[];
}

export interface LikeExpression {
  type: 'like' | 'regex' | 'seq';
  caseInsensitive: boolean;
  value: Expression;
  patterns: Expression[];
}

export interface FunctionCallExpression {
  type: 'function_call';
  name: string;
  args: Expression[];
}

export interface FieldReference {
  type: 'field';
  name: string; // dot-separated, e.g. 'process.name'
}

export interface LiteralExpression {
  type: 'literal';
  value: string | number | boolean | null;
  dataType: 'string' | 'number' | 'boolean' | 'null';
}
