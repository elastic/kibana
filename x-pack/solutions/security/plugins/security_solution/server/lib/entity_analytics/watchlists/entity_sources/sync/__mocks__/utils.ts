/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const actual = jest.requireActual('../utils');

export const getErrorFromBulkResponse = jest.fn().mockReturnValue([]);
export const errorsMsg = jest.fn().mockReturnValue('');
export const isTimestampGreaterThan = jest.fn().mockReturnValue(false);
export const partitionBulkResults = actual.partitionBulkResults;
