/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
/**
 * A string that does not contain only whitespace characters.
 */
export type NonEmptyString = z.infer<typeof NonEmptyString>;
export declare const NonEmptyString: z.ZodString;
/**
 * A string that represents a timestamp in ISO 8601 format and does not contain only whitespace characters.
 */
export type NonEmptyTimestamp = z.infer<typeof NonEmptyTimestamp>;
export declare const NonEmptyTimestamp: z.ZodString;
/**
 * A universally unique identifier.
 */
export type UUID = z.infer<typeof UUID>;
export declare const UUID: z.ZodString;
/**
 * Could be any string, not necessarily a UUID.
 */
export type User = z.infer<typeof User>;
export declare const User: z.ZodObject<
  {
    id: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
  },
  z.core.$strip
>;
/**
 * Map of anonymized values to original values
 */
export type Replacements = z.infer<typeof Replacements>;
export declare const Replacements: z.ZodObject<{}, z.core.$catchall<z.ZodString>>;
/**
 * LLM Provider
 */
export type Provider = z.infer<typeof Provider>;
export declare const Provider: z.ZodEnum<{
  OpenAI: 'OpenAI';
  'Azure OpenAI': 'Azure OpenAI';
  Other: 'Other';
}>;
export type ProviderEnum = typeof Provider.enum;
export declare const ProviderEnum: {
  OpenAI: 'OpenAI';
  'Azure OpenAI': 'Azure OpenAI';
  Other: 'Other';
};
/**
 * LLM API configuration
 */
export type ApiConfig = z.infer<typeof ApiConfig>;
export declare const ApiConfig: z.ZodObject<
  {
    connector_id: z.ZodString;
    action_type_id: z.ZodOptional<z.ZodString>;
    default_system_prompt_id: z.ZodOptional<z.ZodString>;
    provider: z.ZodOptional<
      z.ZodEnum<{
        OpenAI: 'OpenAI';
        'Azure OpenAI': 'Azure OpenAI';
        Other: 'Other';
      }>
    >;
    model: z.ZodOptional<z.ZodString>;
  },
  z.core.$strip
>;
