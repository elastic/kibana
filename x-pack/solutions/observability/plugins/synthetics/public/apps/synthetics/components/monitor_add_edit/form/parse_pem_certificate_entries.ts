/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PEM_CERTIFICATE_BEGIN = '-----BEGIN CERTIFICATE-----';

export const parsePemCertificateEntries = (raw: string): string[] =>
  raw
    .split(/(?=-----BEGIN CERTIFICATE-----)/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.startsWith(PEM_CERTIFICATE_BEGIN));
