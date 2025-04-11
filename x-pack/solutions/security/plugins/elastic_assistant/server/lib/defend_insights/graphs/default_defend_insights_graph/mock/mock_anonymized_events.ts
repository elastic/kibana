/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Document } from '@langchain/core/documents';

export const mockAnonymizedEvents: Document[] = [
  {
    pageContent:
      '_id,87c42d26897490ee02ba42ec4e872910b29f3c69bda357b8faf197b533b8528a\nagent.id,f5b69281-3e7e-4b52-9225-e5c30dc29c78\nprocess.executable,C:\\Windows\\System32\\foobar.exe',
    metadata: {},
  },
  {
    pageContent:
      '_id,be6d293f9a71ba209adbcacc3ba04adfd8e9456260f6af342b7cb0478a7a144a\nagent.id,f5b69281-3e7e-4b52-9225-e5c30dc29c78\nprocess.executable,C:\\Program Files\\Some Antivirus\\foobar.exe',
    metadata: {},
  },
];

export const mockAnonymizedEventsReplacements: Record<string, string> = {
  '42c4e419-c859-47a5-b1cb-f069d48fa509': 'Administrator',
  'f5b69281-3e7e-4b52-9225-e5c30dc29c78': 'SRVWIN07',
};
