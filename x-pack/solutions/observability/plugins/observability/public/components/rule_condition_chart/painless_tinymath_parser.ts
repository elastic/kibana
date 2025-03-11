/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LensOperation } from './helpers';

// This is a parser of a subset operations/expression/statement of Painless  A-Z, +, -, /, *, (, ), ?, !, &, :, |, >, <, = to be used in Lens formula editor that uses TinyMath
// The goal is to parse painless expressions to a format that can be used in Lens formula editor
// The parser will also replace the characters A-Z with the values from aggMap
// Example: "A > 0 ? 10 : 20" will be parsed to "ifelse(average(system.cpu.system.pct) > 0, 10, 20)"
// Technically, this parser is NOT following the normal rules of parsing, means building AST, grammar file, tokenizer, and handling function, because it is a subset of Painless
// This parser is using a simple recursive function to parse the expression and replace the characters with the values from aggMap

export interface AggMap {
  [key: string]: LensOperation;
}
interface PainlessTinyMathParserProps {
  equation: string;
  aggMap?: AggMap;
}
export class PainlessTinyMathParser {
  private IF = '?';
  private ELSE = ':';
  private AND = '&';
  private OR = '|';
  private NOT_EQUAL = '!=';
  private NOT = '!';
  private openParenthesesRegex = /^\(*/g;
  private notRegex = /^\!/g;
  private closeParenthesesRegex = /\)*$/g;
  private logicalConditionRegex = /(\s*[|&]{2})/g;

  private aggMap = {};
  private equation = '';

  constructor({ equation, aggMap }: PainlessTinyMathParserProps) {
    this.aggMap = aggMap || this.aggMap;
    this.equation = this.clean(equation) || this.equation;
    return this;
  }

  clean(expression: string): string {
    return expression
      .replace(/(\s|\n)/g, '')
      .replace('===', '==')
      .replace('!==', '!=');
  }

  diveIntoString(
    expression: string,
    levelDownChar: string,
    levelUpChar: string
  ): number | undefined {
    // Search for the first ? and then start count the depth of the nest IFs
    const expressionLength = expression.length;
    let currentDepth = 0;
    for (let i = expression.indexOf(levelDownChar); i < expressionLength; i++) {
      const char = expression.charAt(i);

      if (char === levelDownChar) {
        currentDepth += 1;
      }
      if (char === levelUpChar) {
        currentDepth -= 1;
      }
      if (currentDepth === 0) {
        return i;
      }
      // IT IS THE LAST CHAR AND THE DEPTH IS NOT 0, SO IT IS INVALID IF ELSE EXPRESSION
      if (i === expressionLength - 1 && currentDepth !== 0) {
        throw new Error('Invalid expression');
      }
    }
  }

  replaceCharactersWithAggMap(inputString: string, aggMap: AggMap): string {
    let parsedInputString = inputString;
    // Iterate over aggregation names and replace them with equation
    Object.keys(aggMap)
      .sort()
      .reverse()
      .forEach((metricName) => {
        parsedInputString = parsedInputString.replaceAll(
          metricName,
          aggMap[metricName].operationWithField
        );
      });

    return parsedInputString;
  }

  parseCondition(condition: string): string {
    // If the condition does not contain any logical operators, return it as it is
    if (
      !condition.includes(this.AND) &&
      !condition.includes(this.OR) &&
      !condition.includes(this.NOT_EQUAL)
    ) {
      return condition;
    }

    const parts = condition.split(this.logicalConditionRegex);
    const filteredParts = parts.filter((part) => part.trim() !== '' || part.includes(this.IF));
    const res = filteredParts.map((part) => {
      // Handle the OR and AND cases and replace them with + and *
      if (part.includes('||')) {
        return part.replace('||', '+').trim();
      }
      if (part.includes('&&')) {
        return part.replace('&&', '*').trim();
      }

      // Handle the NOT and NOT_EQUAL cases and replace them with == and !=
      let isNOT = false;
      if (part.includes(this.NOT)) isNOT = true;
      if (part.includes(this.NOT_EQUAL)) {
        part = part.replace('!=', '==');
      }
      // Strip the part from the parentheses and the NOT characters
      let stripedPart = part
        .replace(this.notRegex, '')
        .replace(this.openParenthesesRegex, '')
        .replace(this.closeParenthesesRegex, '')
        .replace(this.NOT, '')
        .trim();
      // Build the ifelse function and switch the true/false position if it is a NOT case
      // Every condition will be evaluated to 0 or 1 and then we will use the ifelse function to return the correct value
      // example: ifelse(A > 0, 1, 0) example for NOT: ifelse(A > 0, 0, 1)
      // If the condition is a single character e.g. A || B, we will add > 0 to it
      if (/^[A-Z]$/.test(stripedPart)) {
        stripedPart = stripedPart + ' > 0';
      }
      let result = `ifelse(${stripedPart},${isNOT ? '0,1' : '1,0'})`;

      const openParentheses = part.match(this.openParenthesesRegex);
      const closeParentheses = part.match(this.closeParenthesesRegex);

      // Ignore parentheses if they are opened and closed in the same condition as we put them using ifelse function
      // Extra parentheses will throw error in Lens
      // We keep the open parentheses and the closing parentheses that are not part of the same condition
      if (
        openParentheses &&
        openParentheses.length > 0 &&
        closeParentheses &&
        closeParentheses.length > 0
      ) {
        return result;
      }
      // Put back the open parentheses
      if (openParentheses && openParentheses.length > 0) {
        result = openParentheses[0] + result;
      }
      // Put back the closing parentheses
      if (closeParentheses && closeParentheses.length > 0) {
        result = result + closeParentheses[0];
      }
      return result;
    });

    // At the end of the loop, we will have an array of conditions with AND(*) and OR(+)
    // And to evaluate the whole condition, by wrapping them with ifelse and check if all the conditions are true (>0)
    const conditions = res.join(' ') + ' > 0';
    return conditions;
  }

  getTrueBranch(expression: string) {
    const lastColonPosition = this.diveIntoString(expression, this.IF, this.ELSE);
    if (lastColonPosition !== undefined) {
      return expression.substring(expression.indexOf(this.IF) + 1, lastColonPosition);
    }
    return '';
  }

  getFalseBrach(expression: string) {
    const lastColonPosition = this.diveIntoString(expression, this.IF, this.ELSE);
    if (lastColonPosition !== undefined) {
      return expression.substring(lastColonPosition + 1);
    }
    return '';
  }

  getCondition(expression: string): string {
    return expression.substring(0, expression.indexOf(this.IF));
  }

  parse(): string {
    const recursiveParseConditions = (expression: string): string => {
      const condition = this.parseCondition(this.getCondition(expression));
      const trueBranch = this.getTrueBranch(expression);
      const falseBranch = this.getFalseBrach(expression);

      let fullCondition = `ifelse(${condition}, ${trueBranch}, ${falseBranch})`;

      if (trueBranch.includes(this.IF)) {
        const parsedTrueBranch = recursiveParseConditions(trueBranch);
        fullCondition = fullCondition.replace(trueBranch, parsedTrueBranch);
      }
      if (falseBranch.includes(this.IF)) {
        const parsedFalseBranch = recursiveParseConditions(falseBranch);
        fullCondition = fullCondition.replace(falseBranch, parsedFalseBranch);
      }
      const result = this.replaceCharactersWithAggMap(fullCondition, this.aggMap);
      return result;
    };

    if (!this.equation || this.equation === '') throw new Error('Invalid Equation');

    if (this.equation.includes(this.IF)) {
      return recursiveParseConditions(this.equation);
    }
    return this.replaceCharactersWithAggMap(this.equation, this.aggMap);
  }
}
