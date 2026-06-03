/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EqlAst,
  SequenceQuery,
  SequenceTerm,
  EventQuery,
  Expression,
  ComparisonExpression,
  Token,
} from './types';
import { TokenType } from './types';
import { EqlTokenizer } from './tokenizer';

/**
 * Recursive descent parser for EQL queries.
 *
 * Operator precedence (low to high):
 *   OR → AND → NOT → comparison/predicate → additive → multiplicative
 *     → unary → primary (literal, field, function, parenthesized)
 */
export class EqlParser {
  private tokens: Token[] = [];
  private pos = 0;

  parse(input: string): EqlAst {
    const tokenizer = new EqlTokenizer(input);
    this.tokens = tokenizer.tokenize();
    this.pos = 0;

    const ast = this.parseQuery();

    // skip trailing pipes (we don't need them for doc generation)
    while (this.check(TokenType.Pipe)) {
      this.advance();
      // skip pipe name and args until EOF or next pipe
      while (!this.check(TokenType.Pipe) && !this.check(TokenType.EOF)) {
        this.advance();
      }
    }

    return ast;
  }

  // ── Query-level productions ─────────────────────────────────

  private parseQuery(): EqlAst {
    if (this.check(TokenType.Sequence)) {
      return this.parseSequence();
    }
    return this.parseEventQuery();
  }

  private parseSequence(): SequenceQuery {
    this.expect(TokenType.Sequence);

    let joinKeys: string[] = [];
    let maxspan: string | undefined;

    // 'by' can come before or after 'with maxspan'
    if (this.check(TokenType.By)) {
      joinKeys = this.parseJoinKeys();
    }

    if (this.check(TokenType.With)) {
      maxspan = this.parseSequenceParams();
    }

    // 'by' can also come after 'with maxspan' (rare but valid)
    if (joinKeys.length === 0 && this.check(TokenType.By)) {
      joinKeys = this.parseJoinKeys();
    }

    const terms: SequenceTerm[] = [];
    while (this.check(TokenType.LBracket)) {
      terms.push(this.parseSequenceTerm());
    }

    if (terms.length === 0) {
      throw this.error('Expected at least one sequence term [...]');
    }

    let until: SequenceTerm | undefined;
    if (this.check(TokenType.Until)) {
      this.advance();
      until = this.parseSequenceTerm();
    }

    return { type: 'sequence', joinKeys, maxspan, terms, until };
  }

  private parseSequenceParams(): string {
    this.expect(TokenType.With);
    this.expect(TokenType.Maxspan);
    this.expect(TokenType.Assign);
    return this.parseTimeUnit();
  }

  private parseTimeUnit(): string {
    const num = this.expect(TokenType.Number);
    // The unit is an identifier like 's', 'm', 'h', 'd'
    const unit = this.expect(TokenType.Identifier);
    return num.value + unit.value;
  }

  private parseSequenceTerm(): SequenceTerm {
    this.expect(TokenType.LBracket);
    const { eventCategory, condition } = this.parseEventFilter();
    this.expect(TokenType.RBracket);

    let joinKeys: string[] = [];
    if (this.check(TokenType.By)) {
      joinKeys = this.parseJoinKeys();
    }

    return { type: 'sequence_term', eventCategory, condition, joinKeys };
  }

  private parseEventQuery(): EventQuery {
    const { eventCategory, condition } = this.parseEventFilter();
    return { type: 'event_query', eventCategory, condition };
  }

  private parseEventFilter(): { eventCategory: string; condition: Expression } {
    let eventCategory: string;
    if (this.check(TokenType.Any)) {
      eventCategory = 'any';
      this.advance();
    } else {
      const cat = this.expect(TokenType.Identifier);
      eventCategory = cat.value;
    }

    this.expect(TokenType.Where);
    const condition = this.parseExpression();
    return { eventCategory, condition };
  }

  private parseJoinKeys(): string[] {
    this.expect(TokenType.By);
    const keys: string[] = [];
    keys.push(this.parseFieldName());
    while (this.check(TokenType.Comma)) {
      this.advance();
      keys.push(this.parseFieldName());
    }
    return keys;
  }

  // ── Expression parsing (precedence climbing) ────────────────

  private parseExpression(): Expression {
    return this.parseOr();
  }

  private parseOr(): Expression {
    let left = this.parseAnd();
    while (this.check(TokenType.Or)) {
      this.advance();
      const right = this.parseAnd();
      left = { type: 'binary', operator: 'or', left, right };
    }
    return left;
  }

  private parseAnd(): Expression {
    let left = this.parseNot();
    while (this.check(TokenType.And)) {
      this.advance();
      const right = this.parseNot();
      left = { type: 'binary', operator: 'and', left, right };
    }
    return left;
  }

  private parseNot(): Expression {
    if (this.check(TokenType.Not)) {
      this.advance();
      const operand = this.parseNot();
      return { type: 'unary', operator: 'not', operand };
    }
    return this.parseComparison();
  }

  private parseComparison(): Expression {
    let left = this.parseAdditive();

    // Comparison operators
    if (
      this.check(TokenType.Eq) ||
      this.check(TokenType.Neq) ||
      this.check(TokenType.Lt) ||
      this.check(TokenType.Lte) ||
      this.check(TokenType.Gt) ||
      this.check(TokenType.Gte)
    ) {
      const op = this.advance();
      const right = this.parseAdditive();
      return {
        type: 'comparison',
        operator: op.value as ComparisonExpression['operator'],
        left,
        right,
      };
    }

    // Wildcard match (:)
    if (this.check(TokenType.Colon)) {
      this.advance();
      const right = this.parsePrimary();
      return { type: 'wildcard_match', field: left, value: right };
    }

    // Single = (legacy EQL syntax, same as ==)
    if (this.check(TokenType.Assign)) {
      this.advance();
      const right = this.parseAdditive();
      return { type: 'comparison', operator: '==', left, right };
    }

    // Predicate: [not] in/like/regex/seq
    left = this.parsePredicate(left);

    return left;
  }

  private parsePredicate(left: Expression): Expression {
    const negated = this.check(TokenType.Not);
    if (negated) {
      // peek ahead to see if it's 'not in' / 'not like' etc.
      const next = this.peek(1);
      if (
        next &&
        (next.type === TokenType.In ||
          next.type === TokenType.InInsensitive ||
          next.type === TokenType.Like ||
          next.type === TokenType.LikeInsensitive ||
          next.type === TokenType.Regex ||
          next.type === TokenType.RegexInsensitive ||
          next.type === TokenType.Seq)
      ) {
        this.advance(); // consume 'not'
      } else {
        return left; // standalone 'not' is handled at higher level
      }
    }

    if (this.check(TokenType.In) || this.check(TokenType.InInsensitive)) {
      const caseInsensitive = this.current().type === TokenType.InInsensitive;
      this.advance();
      this.expect(TokenType.LParen);
      const list: Expression[] = [];
      list.push(this.parseExpression());
      while (this.check(TokenType.Comma)) {
        this.advance();
        list.push(this.parseExpression());
      }
      this.expect(TokenType.RParen);
      return { type: 'in', negated, caseInsensitive, value: left, list };
    }

    if (
      this.check(TokenType.Like) ||
      this.check(TokenType.LikeInsensitive) ||
      this.check(TokenType.Regex) ||
      this.check(TokenType.RegexInsensitive) ||
      this.check(TokenType.Seq)
    ) {
      const tok = this.advance();
      const kind = tok.type === TokenType.Seq ? 'seq' : tok.type.toString().startsWith('Regex') ? 'regex' : 'like';
      const caseInsensitive =
        tok.type === TokenType.LikeInsensitive || tok.type === TokenType.RegexInsensitive;

      const patterns: Expression[] = [];
      if (this.check(TokenType.LParen)) {
        this.advance();
        patterns.push(this.parsePrimary());
        while (this.check(TokenType.Comma)) {
          this.advance();
          patterns.push(this.parsePrimary());
        }
        this.expect(TokenType.RParen);
      } else {
        patterns.push(this.parsePrimary());
      }
      return { type: kind as 'like' | 'regex' | 'seq', caseInsensitive, value: left, patterns };
    }

    return left;
  }

  private parseAdditive(): Expression {
    let left = this.parseMultiplicative();
    while (this.check(TokenType.Plus) || this.check(TokenType.Minus)) {
      const op = this.advance();
      const right = this.parseMultiplicative();
      left = {
        type: 'binary',
        operator: op.value as '+' | '-',
        left,
        right,
      };
    }
    return left;
  }

  private parseMultiplicative(): Expression {
    let left = this.parseUnary();
    while (
      this.check(TokenType.Star) ||
      this.check(TokenType.Slash) ||
      this.check(TokenType.Percent)
    ) {
      const op = this.advance();
      const right = this.parseUnary();
      left = {
        type: 'binary',
        operator: op.value as '*' | '/' | '%',
        left,
        right,
      };
    }
    return left;
  }

  private parseUnary(): Expression {
    if (this.check(TokenType.Minus)) {
      this.advance();
      const operand = this.parseUnary();
      return { type: 'unary', operator: '-', operand };
    }
    if (this.check(TokenType.Plus)) {
      this.advance();
      const operand = this.parseUnary();
      return { type: 'unary', operator: '+', operand };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): Expression {
    // Parenthesized expression
    if (this.check(TokenType.LParen)) {
      this.advance();
      const expr = this.parseExpression();
      this.expect(TokenType.RParen);
      return expr;
    }

    // Null
    if (this.check(TokenType.Null)) {
      this.advance();
      return { type: 'literal', value: null, dataType: 'null' };
    }

    // Boolean
    if (this.check(TokenType.Boolean)) {
      const tok = this.advance();
      return { type: 'literal', value: tok.value === 'true', dataType: 'boolean' };
    }

    // Number
    if (this.check(TokenType.Number)) {
      const tok = this.advance();
      return { type: 'literal', value: parseFloat(tok.value), dataType: 'number' };
    }

    // String
    if (this.check(TokenType.String)) {
      const tok = this.advance();
      return { type: 'literal', value: tok.value, dataType: 'string' };
    }

    // Wildcard (*) as a literal
    if (this.check(TokenType.Star)) {
      this.advance();
      return { type: 'literal', value: '*', dataType: 'string' };
    }

    // Identifier — could be field reference or function call
    if (this.check(TokenType.Identifier) || this.check(TokenType.Any)) {
      const name = this.parseFieldName();

      // Function call
      if (this.check(TokenType.LParen)) {
        this.advance();
        const args: Expression[] = [];
        if (!this.check(TokenType.RParen)) {
          args.push(this.parseExpression());
          while (this.check(TokenType.Comma)) {
            this.advance();
            args.push(this.parseExpression());
          }
        }
        this.expect(TokenType.RParen);
        return { type: 'function_call', name, args };
      }

      return { type: 'field', name };
    }

    throw this.error(`Unexpected token: ${this.current().type} (${this.current().value})`);
  }

  // ── Field name (dot-separated identifiers) ──────────────────

  private parseFieldName(): string {
    // We already consumed dots during tokenization since isIdentPart includes '.'
    // So a field like 'process.name' comes as a single Identifier token
    const tok = this.advance();
    return tok.value;
  }

  // ── Token helpers ───────────────────────────────────────────

  private current(): Token {
    return this.tokens[this.pos] ?? { type: TokenType.EOF, value: '', position: -1 };
  }

  private peek(offset: number): Token | undefined {
    return this.tokens[this.pos + offset];
  }

  private check(type: TokenType): boolean {
    return this.current().type === type;
  }

  private advance(): Token {
    const tok = this.current();
    this.pos++;
    return tok;
  }

  private expect(type: TokenType): Token {
    if (!this.check(type)) {
      throw this.error(`Expected ${type}, got ${this.current().type} (${this.current().value})`);
    }
    return this.advance();
  }

  private error(message: string): Error {
    const tok = this.current();
    return new Error(`EQL parse error at position ${tok.position}: ${message}`);
  }
}
