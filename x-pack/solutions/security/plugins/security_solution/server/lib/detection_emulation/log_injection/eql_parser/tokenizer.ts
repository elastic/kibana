/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Token, TokenType } from './types';

const KEYWORDS: Record<string, TokenType> = {
  sequence: TokenType.Sequence,
  sample: TokenType.Sample,
  join: TokenType.Join,
  by: TokenType.By,
  with: TokenType.With,
  maxspan: TokenType.Maxspan,
  until: TokenType.Until,
  where: TokenType.Where,
  and: TokenType.And,
  or: TokenType.Or,
  not: TokenType.Not,
  in: TokenType.In,
  'in~': TokenType.InInsensitive,
  like: TokenType.Like,
  'like~': TokenType.LikeInsensitive,
  regex: TokenType.Regex,
  'regex~': TokenType.RegexInsensitive,
  seq: TokenType.Seq,
  of: TokenType.Of,
  any: TokenType.Any,
  true: TokenType.Boolean,
  false: TokenType.Boolean,
  null: TokenType.Null,
};

export class EqlTokenizer {
  private pos = 0;
  private readonly input: string;

  constructor(input: string) {
    this.input = input;
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];
    while (this.pos < this.input.length) {
      this.skipWhitespace();
      if (this.pos >= this.input.length) break;

      const token = this.readToken();
      if (token) {
        tokens.push(token);
      }
    }
    tokens.push({ type: TokenType.EOF, value: '', position: this.pos });
    return tokens;
  }

  private skipWhitespace(): void {
    while (this.pos < this.input.length) {
      const ch = this.input[this.pos];
      if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
        this.pos++;
      } else if (this.input.startsWith('//', this.pos)) {
        // line comment
        while (this.pos < this.input.length && this.input[this.pos] !== '\n') {
          this.pos++;
        }
      } else if (this.input.startsWith('/*', this.pos)) {
        // block comment
        this.pos += 2;
        while (this.pos < this.input.length - 1 && !this.input.startsWith('*/', this.pos)) {
          this.pos++;
        }
        this.pos += 2;
      } else {
        break;
      }
    }
  }

  private readToken(): Token | null {
    const start = this.pos;
    const ch = this.input[this.pos];

    // Two-character operators
    if (this.pos + 1 < this.input.length) {
      const two = this.input.substring(this.pos, this.pos + 2);
      switch (two) {
        case '==':
          this.pos += 2;
          return { type: TokenType.Eq, value: '==', position: start };
        case '!=':
          this.pos += 2;
          return { type: TokenType.Neq, value: '!=', position: start };
        case '<=':
          this.pos += 2;
          return { type: TokenType.Lte, value: '<=', position: start };
        case '>=':
          this.pos += 2;
          return { type: TokenType.Gte, value: '>=', position: start };
      }
    }

    // Single-character tokens
    switch (ch) {
      case '(':
        this.pos++;
        return { type: TokenType.LParen, value: '(', position: start };
      case ')':
        this.pos++;
        return { type: TokenType.RParen, value: ')', position: start };
      case '[':
        this.pos++;
        return { type: TokenType.LBracket, value: '[', position: start };
      case ']':
        this.pos++;
        return { type: TokenType.RBracket, value: ']', position: start };
      case ',':
        this.pos++;
        return { type: TokenType.Comma, value: ',', position: start };
      case '|':
        this.pos++;
        return { type: TokenType.Pipe, value: '|', position: start };
      case '<':
        this.pos++;
        return { type: TokenType.Lt, value: '<', position: start };
      case '>':
        this.pos++;
        return { type: TokenType.Gt, value: '>', position: start };
      case '+':
        this.pos++;
        return { type: TokenType.Plus, value: '+', position: start };
      case '-':
        // Could be minus or start of a number
        if (this.pos + 1 < this.input.length && this.isDigit(this.input[this.pos + 1])) {
          return this.readNumber();
        }
        this.pos++;
        return { type: TokenType.Minus, value: '-', position: start };
      case '/':
        this.pos++;
        return { type: TokenType.Slash, value: '/', position: start };
      case '%':
        this.pos++;
        return { type: TokenType.Percent, value: '%', position: start };
      case ':':
        this.pos++;
        return { type: TokenType.Colon, value: ':', position: start };
      case '=':
        this.pos++;
        return { type: TokenType.Assign, value: '=', position: start };
      case '*':
        this.pos++;
        return { type: TokenType.Star, value: '*', position: start };
    }

    // Strings
    if (ch === '"' || ch === "'") {
      return this.readString(ch);
    }

    // Triple-quoted strings
    if (
      ch === '"' &&
      this.input.startsWith('"""', this.pos)
    ) {
      return this.readTripleQuotedString();
    }

    // ? prefix for optional fields (ignore for our purposes, treat as identifier)
    if (ch === '?') {
      this.pos++;
      // read the next identifier
      const ident = this.readIdentifierOrKeyword();
      if (ident) {
        ident.value = '?' + ident.value;
        ident.position = start;
      }
      return ident;
    }

    // Numbers
    if (this.isDigit(ch)) {
      return this.readNumber();
    }

    // Identifiers and keywords
    if (this.isIdentStart(ch)) {
      return this.readIdentifierOrKeyword();
    }

    // Unknown character — skip
    this.pos++;
    return null;
  }

  private readString(quote: string): Token {
    const start = this.pos;
    this.pos++; // skip opening quote
    let value = '';
    while (this.pos < this.input.length && this.input[this.pos] !== quote) {
      if (this.input[this.pos] === '\\' && this.pos + 1 < this.input.length) {
        this.pos++;
        const esc = this.input[this.pos];
        switch (esc) {
          case 'n':
            value += '\n';
            break;
          case 't':
            value += '\t';
            break;
          case 'r':
            value += '\r';
            break;
          case '\\':
            value += '\\';
            break;
          default:
            value += esc;
            break;
        }
      } else {
        value += this.input[this.pos];
      }
      this.pos++;
    }
    this.pos++; // skip closing quote
    return { type: TokenType.String, value, position: start };
  }

  private readTripleQuotedString(): Token {
    const start = this.pos;
    this.pos += 3; // skip """
    let value = '';
    while (this.pos < this.input.length - 2 && !this.input.startsWith('"""', this.pos)) {
      value += this.input[this.pos];
      this.pos++;
    }
    this.pos += 3; // skip closing """
    return { type: TokenType.String, value, position: start };
  }

  private readNumber(): Token {
    const start = this.pos;
    if (this.input[this.pos] === '-') this.pos++;
    while (this.pos < this.input.length && this.isDigit(this.input[this.pos])) {
      this.pos++;
    }
    if (this.pos < this.input.length && this.input[this.pos] === '.') {
      this.pos++;
      while (this.pos < this.input.length && this.isDigit(this.input[this.pos])) {
        this.pos++;
      }
    }
    return {
      type: TokenType.Number,
      value: this.input.substring(start, this.pos),
      position: start,
    };
  }

  private readIdentifierOrKeyword(): Token {
    const start = this.pos;
    while (this.pos < this.input.length && this.isIdentPart(this.input[this.pos])) {
      this.pos++;
    }
    let value = this.input.substring(start, this.pos);

    // Check for tilde-suffixed keywords (like~, regex~, in~)
    if (this.pos < this.input.length && this.input[this.pos] === '~') {
      const tildeKey = value + '~';
      if (tildeKey.toLowerCase() in KEYWORDS) {
        this.pos++;
        value = tildeKey;
      }
    }

    const lower = value.toLowerCase();
    const keywordType = KEYWORDS[lower];
    if (keywordType) {
      return { type: keywordType, value: lower, position: start };
    }

    return { type: TokenType.Identifier, value, position: start };
  }

  private isDigit(ch: string): boolean {
    return ch >= '0' && ch <= '9';
  }

  private isIdentStart(ch: string): boolean {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_' || ch === '@';
  }

  private isIdentPart(ch: string): boolean {
    return this.isIdentStart(ch) || this.isDigit(ch) || ch === '.';
  }
}
