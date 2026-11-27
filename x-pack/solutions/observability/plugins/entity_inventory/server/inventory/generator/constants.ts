/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { quoteIdentifier } from './esql_syntax';

export const TIMESTAMP = quoteIdentifier('@timestamp');
export const INDEX_MODE = quoteIdentifier('_index_mode');
/** Joins the predicates of a `WHERE`, one per line. */
export const CONTINUATION = '\n    ';
