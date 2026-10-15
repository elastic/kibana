/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The UTC day (`YYYY-MM-DD`) a snapshot taken at `date` describes. */
export const toSnapshotDay = (date: Date): string => date.toISOString().slice(0, 10);
