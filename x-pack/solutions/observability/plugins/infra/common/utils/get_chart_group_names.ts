/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// It's simple function to be shared, but it is required on both sides server and frontend
// We need to get consistent group names when any changes occurs.
export const getChartGroupNames = (fields: string[]) => fields.join(', ');
