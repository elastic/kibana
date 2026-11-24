/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHmac } from 'crypto';

export const AZURE_BLOB_SAS_VERSION = '2022-11-02';

export const EXPORT_SAS_PERMISSIONS = 'rcw';

export interface CreateAzureBlobServiceSasOptions {
  accountName: string;
  /** The stored base64 account key */
  accountKey: string;
  container: string;
  blobPath: string;
  expiresOn: Date;
}

/** `YYYY-MM-DDTHH:mm:ssZ`: the signed and the emitted value must be identical */
const formatSasDate = (date: Date): string => `${date.toISOString().slice(0, 19)}Z`;

/** Service SAS for one blob (`sr=b`), https only, no start time. A query string without a leading `?`. */
export const createAzureBlobServiceSas = ({
  accountName,
  accountKey,
  container,
  blobPath,
  expiresOn,
}: CreateAzureBlobServiceSasOptions): string => {
  const expiry = formatSasDate(expiresOn);
  // Field order of the 2022-11-02 service SAS string-to-sign; empty lines are unused fields
  const stringToSign = [
    EXPORT_SAS_PERMISSIONS,
    '', // st
    expiry,
    `/blob/${accountName}/${container}/${blobPath}`,
    '', // si
    '', // sip
    'https',
    AZURE_BLOB_SAS_VERSION,
    'b',
    '', // snapshot time
    '', // ses
    '', // rscc
    '', // rscd
    '', // rsce
    '', // rscl
    '', // rsct
  ].join('\n');
  const signature = createHmac('sha256', Buffer.from(accountKey, 'base64'))
    .update(stringToSign, 'utf8')
    .digest('base64');

  return [
    ['sv', AZURE_BLOB_SAS_VERSION],
    ['spr', 'https'],
    ['se', expiry],
    ['sr', 'b'],
    ['sp', EXPORT_SAS_PERMISSIONS],
    ['sig', signature],
  ]
    .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
    .join('&');
};
