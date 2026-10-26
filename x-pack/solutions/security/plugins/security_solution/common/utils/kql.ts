/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flow, isString } from 'lodash/fp';

/**
 * Preparing an arbitrary KQL query param by quoting and escaping string values, stringifying non string values.
 *
 * See https://www.elastic.co/guide/en/kibana/current/kuery-query.html
 *
 * @param value
 * @returns
 */
export function prepareKQLParam(value: string | number | boolean): string {
  return isString(value) ? prepareKQLStringParam(value) : `${value}`;
}

/**
 * Prepares a string KQL query param by wrapping the value in quotes and making sure
 * the quotes, tabs and new line symbols inside are escaped.
 *
 * See https://www.elastic.co/guide/en/kibana/current/kuery-query.html
 *
 * @param value a string param value intended to be passed to KQL
 * @returns a quoted and escaped string param value
 */
export function prepareKQLStringParam(value: string): string {
  return `"${escapeKQLStringParam(value)}"`;
}

/**
 * Partially escapes string param intended to be passed to KQL.
 *
 * This is intended to be used for KQL search terms surrounded by quotes.
 * It escapes quotes, backslashes, tabs and new line symbols.
 *
 * @param param a string param value intended to be passed to KQL
 * @returns a partially escaped KQL string param
 */
export function escapeKQLStringParam(value = ''): string {
  return partiallyEscapeStringValue(value);
}

const escapeQuotes = (val: string) => val.replace(/["]/g, '\\$&'); // $& means the whole matched string

const escapeBackslash = (val: string) => val.replace(/\\/g, '\\$&');

const escapeTabs = (val: string) =>
  val.replace(/\t/g, '\\t').replace(/\r/g, '\\r').replace(/\n/g, '\\n');

const partiallyEscapeStringValue = flow(escapeBackslash, escapeQuotes, escapeTabs);

/**
 * Fully escapes special characters to improve matching on KQL.
 *
 * As per official docs [here](https://www.elastic.co/guide/en/kibana/current/kuery-query.html)
 * `Certain characters must be escaped by a backslash (unless surrounded by quotes).` and
 * `You must escape following characters: \():<>"*`.
 *
 * This is intended to be used on KQL search terms WITHOUT quotes.
 *
 * @example "a \"user-agent+ \t }with \n a *\:(surprise!) " => "a \\\\"user-agent+ \\}with a \\*\\\\:\\(surprise!\\)"
 *
 * @see https://www.elastic.co/docs/reference/query-languages/kql
 *
 * @param param a string param value intended to be passed to KQL
 * @returns a fully escaped KQL string value
 */
export function fullyEscapeKQLStringParam(value = ''): string {
  return fullyEscapeStringValue(value);
}

const SPECIAL_KQL_CHARACTERS = '\\(){}:<>"*';
const SPECIAL_KQL_CHARACTERS_REGEX = new RegExp(
  `[${SPECIAL_KQL_CHARACTERS.split('').join('\\')}]`,
  'g'
);

const escapeSpecialKQLCharacters = (val: string) =>
  val.replace(SPECIAL_KQL_CHARACTERS_REGEX, '\\$&');

const simplifyWhitespace = (val: string) => val.replace(/\s+/g, ' ');

const trim = (val: string) => val.trim();

const fullyEscapeStringValue = flow(escapeSpecialKQLCharacters, simplifyWhitespace, trim);
