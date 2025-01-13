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

const escapeQuotes = (val: string) => val.replace(/["]/g, '\\$&'); // $& means the whole matched string

const escapeTabs = (val: string) =>
  val.replace(/\t/g, '\\t').replace(/\r/g, '\\r').replace(/\n/g, '\\n');

const escapeStringValue = flow(escapeQuotes, escapeTabs);
