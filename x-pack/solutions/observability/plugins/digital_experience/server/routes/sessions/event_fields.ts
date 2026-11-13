/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { attributeField, resourceAttributeField } from '../../../common/otel_data';

/** A raw event as the `fields` option returns it: each field's values, by its dotted name. */
export type OtelEventFields = Partial<Record<string, unknown[]>>;

const firstValue = (event: OtelEventFields, field: string): unknown => event[field]?.[0];

const stringValue = (value: unknown): string | null => {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  return typeof value === 'number' || typeof value === 'boolean' ? String(value) : null;
};

export const fieldString = (event: OtelEventFields, field: string): string | null =>
  stringValue(firstValue(event, field));

export const fieldNumber = (event: OtelEventFields, field: string): number | null => {
  const value = firstValue(event, field);
  const number = typeof value === 'string' && value.length > 0 ? Number(value) : value;
  return typeof number === 'number' && Number.isFinite(number) ? number : null;
};

/** An attribute of the event, else of its resource. */
export const attributeString = (event: OtelEventFields, name: string): string | null =>
  fieldString(event, attributeField(name)) ?? fieldString(event, resourceAttributeField(name));

export const attributeNumber = (event: OtelEventFields, name: string): number | null =>
  fieldNumber(event, attributeField(name)) ?? fieldNumber(event, resourceAttributeField(name));

/** The event's `@timestamp` in epoch milliseconds, if it has a valid one. */
export const timestampMsOf = (event: OtelEventFields): number | null => {
  const timestamp = fieldString(event, '@timestamp');
  const ms = timestamp ? Date.parse(timestamp) : NaN;
  return Number.isFinite(ms) ? ms : null;
};
