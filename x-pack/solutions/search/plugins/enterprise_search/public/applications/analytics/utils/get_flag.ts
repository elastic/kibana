/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getFlag = (countryCode: string): string | null =>
  countryCode && countryCode.length === 2
    ? countryCode
        .toUpperCase()
        .replace(/./g, (c) => String.fromCharCode(55356, 56741 + c.charCodeAt(0)))
    : null;
