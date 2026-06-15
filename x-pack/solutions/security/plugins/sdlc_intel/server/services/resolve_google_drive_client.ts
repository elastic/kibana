/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License 2.0.
 */

import type { AxiosInstance } from 'axios';
import type { KibanaRequest } from '@kbn/core/server';
import { resolveConnectorAxiosClient } from './resolve_connector_client';

export const GOOGLE_DRIVE_CONNECTOR_TYPE_ID = '.google_drive';

export const resolveGoogleDriveClient = async ({
  request,
  googleDriveConnectorId,
}: {
  request: KibanaRequest;
  googleDriveConnectorId: string;
}): Promise<AxiosInstance> =>
  resolveConnectorAxiosClient({
    request,
    connectorIdOrName: googleDriveConnectorId,
    expectedTypeId: GOOGLE_DRIVE_CONNECTOR_TYPE_ID,
  });

export const fetchSpreadsheetCsv = async ({
  client,
  spreadsheetId,
  sheetGid,
}: {
  client: AxiosInstance;
  spreadsheetId: string;
  sheetGid: string;
}): Promise<string> => {
  const response = await client.get<string>(
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export`,
    {
      params: {
        format: 'csv',
        gid: sheetGid,
      },
      responseType: 'text',
    }
  );

  if (typeof response.data !== 'string' || response.data.trim().length === 0) {
    throw new Error('Google Sheet export returned empty CSV content.');
  }

  return response.data;
};
