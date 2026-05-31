/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License 2.0.
 */

import {
  SDLC_INDEX_NAMES,
  buildSlackReleaseDocumentId,
  buildSpreadsheetReleaseDocumentId,
  parseServerlessSlackMessages,
  parseStackReleaseSpreadsheet,
  type ReleaseCalendarEvent,
} from '@kbn/sdlc-data-layer';
import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import { fetchSpreadsheetCsv, resolveGoogleDriveClient } from './resolve_google_drive_client';
import { resolveSlackClient, searchSlackReleaseMessages } from './resolve_slack_client';

const toReleaseCalendarDocument = ({
  event,
  runId,
  documentId,
}: {
  event: ReleaseCalendarEvent;
  runId: string;
  documentId: string;
}) => ({
  index: SDLC_INDEX_NAMES.SDLC_RELEASE_CALENDAR,
  id: documentId,
  document: {
    '@timestamp': new Date().toISOString(),
    sync: {
      run_id: runId,
      source: 'workflow',
    },
    release_line: event.releaseLine,
    product: event.product,
    version: event.version,
    milestone: event.milestone,
    target_date: event.targetDate,
    status: event.status,
    release_manager: event.releaseManager,
    source: {
      type: event.source.type,
      spreadsheet_id: event.source.spreadsheetId,
      sheet_gid: event.source.sheetGid,
      sheet_name: event.source.sheetName,
      slack_channel: event.source.slackChannel,
      message_ts: event.source.messageTs,
      permalink: event.source.permalink,
      raw_text: event.source.rawText,
    },
  },
});

const indexReleaseCalendarEvents = async ({
  esClient,
  events,
  runId,
  buildDocumentId,
}: {
  esClient: ElasticsearchClient;
  events: ReleaseCalendarEvent[];
  runId: string;
  buildDocumentId: (event: ReleaseCalendarEvent) => string;
}): Promise<{ processed: number; updated: number }> => {
  if (events.length === 0) {
    return { processed: 0, updated: 0 };
  }

  const operations = events.flatMap((event) => {
    const documentId = buildDocumentId(event);
    const body = toReleaseCalendarDocument({ event, runId, documentId });
    return [{ index: { _index: body.index, _id: body.id } }, body.document];
  });

  const bulkResponse = await esClient.bulk({
    refresh: true,
    operations,
  });

  if (bulkResponse.errors) {
    const firstError = bulkResponse.items?.find((item) => item.index?.error)?.index?.error;
    throw new Error(
      `Failed to index release calendar documents: ${firstError?.reason ?? 'unknown bulk error'}`
    );
  }

  return { processed: events.length, updated: events.length };
};

export const syncReleaseCalendarFromSlack = async ({
  esClient,
  request,
  runId,
  slackConnectorId,
  channelName,
  lookbackHours = 48,
}: {
  esClient: ElasticsearchClient;
  request: KibanaRequest;
  runId: string;
  slackConnectorId: string;
  channelName: string;
  lookbackHours?: number;
}): Promise<{ processed: number; updated: number }> => {
  const slackClient = await resolveSlackClient({ request, slackConnectorId });
  const messages = await searchSlackReleaseMessages({
    client: slackClient,
    channelName,
    lookbackHours,
  });
  const events = parseServerlessSlackMessages(messages);

  return indexReleaseCalendarEvents({
    esClient,
    events,
    runId,
    buildDocumentId: (event) =>
      buildSlackReleaseDocumentId({
        releaseLine: event.releaseLine,
        version: event.version,
        milestone: event.milestone,
        messageTs: event.source.messageTs ?? `${event.version}:${event.milestone}`,
      }),
  });
};

export const syncReleaseCalendarFromSpreadsheet = async ({
  esClient,
  request,
  runId,
  googleDriveConnectorId,
  spreadsheetId,
  sheetGid,
  sheetName,
}: {
  esClient: ElasticsearchClient;
  request: KibanaRequest;
  runId: string;
  googleDriveConnectorId: string;
  spreadsheetId: string;
  sheetGid: string;
  sheetName?: string;
}): Promise<{ processed: number; updated: number }> => {
  const googleClient = await resolveGoogleDriveClient({ request, googleDriveConnectorId });
  const csv = await fetchSpreadsheetCsv({
    client: googleClient,
    spreadsheetId,
    sheetGid,
  });
  const events = parseStackReleaseSpreadsheet({
    csv,
    spreadsheetId,
    sheetGid,
    sheetName,
  });

  return indexReleaseCalendarEvents({
    esClient,
    events,
    runId,
    buildDocumentId: (event) =>
      buildSpreadsheetReleaseDocumentId({
        releaseLine: event.releaseLine,
        version: event.version,
        milestone: event.milestone,
      }),
  });
};
