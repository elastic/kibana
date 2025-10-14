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
 * Escapes string param intended to be passed to KQL. As official docs
 * [here](https://www.elastic.co/guide/en/kibana/current/kuery-query.html) say
 * `Certain characters must be escaped by a backslash (unless surrounded by quotes).` and
 * `You must escape following characters: \():<>"*`.
 *
 * This function assumes the value is surrounded by quotes so it escapes quotes, tabs and new line symbols.
 *
 * @param param a string param value intended to be passed to KQL
 * @returns an escaped string param value
 */
export function escapeKQLStringParam(value = ''): string {
  return escapeStringValue(value);
}
/**
 * Cleans up special characters to improve matching on KQL.
 * Instead of escaping them, we replace them with spaces to improve search results,
 * since the underlying reverse index does not contain special characters to match against.
 * (they get stripped out automatically during indexing and tokenization)
 *
 * This is intended to be used on KQL search terms WITHOUT quotes.
 *
 * @example "a \"user-agent+ \t }with \n a *\:(surprise)" => "a user agent with a surprise"
 *
 * @see https://www.elastic.co/docs/reference/query-languages/kql
 */
export function cleanupKQLStringParam(value = ''): string {
  return cleanupStringValue(value);
}

const SPECIAL_KQL_CHARACTERS = '\\(){}:<>"*-+';

const removeSpecialCharacters = (val: string) =>
  val.replace(new RegExp(`[${SPECIAL_KQL_CHARACTERS.split('').join('\\')}]`, 'g'), ' ');

const simplifyWhitespace = (val: string) => val.replace(/\s+|\t+|\r+|\n+/g, ' ');

const trim = (val: string) => val.trim();

const cleanupStringValue = flow(removeSpecialCharacters, simplifyWhitespace, trim);

const escapeQuotes = (val: string) => val.replace(/["]/g, '\\$&'); // $& means the whole matched string

const removeEndingBackslash = (val: string) => val.replace(/\\$/, '');

const escapeTabs = (val: string) =>
  val.replace(/\t/g, '\\t').replace(/\r/g, '\\r').replace(/\n/g, '\\n');

const escapeStringValue = flow(escapeQuotes, removeEndingBackslash, escapeTabs);
