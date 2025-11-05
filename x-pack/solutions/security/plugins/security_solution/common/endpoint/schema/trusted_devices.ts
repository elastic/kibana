/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { OperatingSystem, TrustedDeviceConditionEntryField } from '@kbn/securitysolution-utils';
import type { TrustedDeviceConditionEntry } from '../types';

export const GetTrustedDevicesRequestSchema = {
  query: schema.object({
    page: schema.maybe(schema.number({ defaultValue: 1, min: 1 })),
    per_page: schema.maybe(schema.number({ defaultValue: 20, min: 1 })),
    kuery: schema.maybe(schema.string()),
  }),
};

export const GetTrustedDevicesSummaryRequestSchema = {
  query: schema.object({
    kuery: schema.maybe(schema.string()),
  }),
};

const ConditionEntryTypeSchema = schema.oneOf([
  schema.literal('match'),
  schema.literal('wildcard'),
]);
const ConditionEntryOperatorSchema = schema.literal('included');

const TrustedDeviceEntrySchema = schema.object({
  field: schema.oneOf([
    schema.literal(TrustedDeviceConditionEntryField.DEVICE_ID),
    schema.literal(TrustedDeviceConditionEntryField.DEVICE_TYPE),
    schema.literal(TrustedDeviceConditionEntryField.HOST),
    schema.literal(TrustedDeviceConditionEntryField.MANUFACTURER),
    schema.literal(TrustedDeviceConditionEntryField.MANUFACTURER_ID),
    schema.literal(TrustedDeviceConditionEntryField.PRODUCT_ID),
    schema.literal(TrustedDeviceConditionEntryField.PRODUCT_NAME),
    schema.literal(TrustedDeviceConditionEntryField.USERNAME),
  ]),
  type: ConditionEntryTypeSchema,
  operator: ConditionEntryOperatorSchema,
  value: schema.string({
    validate: (field: string) => (field.length > 0 ? undefined : `invalidField.${field}`),
  }),
});

const getTrustedDeviceDuplicateFields = (entries: TrustedDeviceConditionEntry[]): string[] => {
  const fields: string[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    if (seen.has(entry.field)) {
      fields.push(entry.field);
    } else {
      seen.add(entry.field);
    }
  }

  return fields;
};

const entriesSchemaOptions = {
  minSize: 1,
  validate(entries: TrustedDeviceConditionEntry[]) {
    return (
      getTrustedDeviceDuplicateFields(entries)
        .map((field) => `duplicatedEntry.${field}`)
        .join(', ') || undefined
    );
  },
};

const EntriesSchema = schema.arrayOf(TrustedDeviceEntrySchema, entriesSchemaOptions);

const getTrustedDeviceForOsScheme = () =>
  schema.object({
    name: schema.string({ minLength: 1, maxLength: 256 }),
    description: schema.maybe(schema.string({ minLength: 0, maxLength: 256, defaultValue: '' })),
    os: schema.oneOf([
      schema.literal(OperatingSystem.WINDOWS),
      schema.literal(OperatingSystem.MAC),
      // Note: Linux support will be added in the future
    ]),
    effectScope: schema.oneOf([
      schema.object({
        type: schema.literal('global'),
      }),
      schema.object({
        type: schema.literal('policy'),
        policies: schema.arrayOf(schema.string({ minLength: 1 })),
      }),
    ]),
    entries: EntriesSchema,
    version: schema.maybe(schema.string()),
  });

export const PostTrustedDeviceCreateRequestSchema = {
  body: getTrustedDeviceForOsScheme(),
};

export const PutTrustedDeviceUpdateRequestSchema = {
  params: schema.object({
    id: schema.string(),
  }),
  body: getTrustedDeviceForOsScheme(),
};
