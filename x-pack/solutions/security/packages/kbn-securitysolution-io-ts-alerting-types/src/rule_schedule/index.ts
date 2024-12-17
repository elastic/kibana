/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { From } from '../from';

export type RuleInterval = t.TypeOf<typeof RuleInterval>;
export const RuleInterval = t.string; // we need a more specific schema

export type RuleIntervalFrom = t.TypeOf<typeof RuleIntervalFrom>;
export const RuleIntervalFrom = From;

/**
 * TODO: Create a regular expression type or custom date math part type here
 */
export type RuleIntervalTo = t.TypeOf<typeof RuleIntervalTo>;
export const RuleIntervalTo = t.string; // we need a more specific schema
