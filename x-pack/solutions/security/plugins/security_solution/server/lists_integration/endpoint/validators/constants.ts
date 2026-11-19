/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Max length for an entry `value` — e.g. a file hash, file/executable path, etc.
 */
export const ENTRY_VALUE_MAX_LENGTH = 4096;

/**
 * Max length for an entry `field` — an Elasticsearch field/mapping name.
 */
export const ENTRY_FIELD_MAX_LENGTH = 1024;
