/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Converts a dot notation path to a bracket notation path
 * e.g "a.b.c" => "a['b']['c']"
 * @param {string} path
 * @return {*}  {string}
 */

// convert a path like a.b.c to a?.b?.c
export const getConditionalPath = (path: string): string => path.split('.').join('?.');
