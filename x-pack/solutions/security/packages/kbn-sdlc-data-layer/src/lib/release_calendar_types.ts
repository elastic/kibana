/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License 2.0.
 */

export type ReleaseLine = 'stack' | 'serverless';

export type ReleaseMilestone =
  | 'feature_freeze'
  | 'build_candidate'
  | 'public_release'
  | 'deploy'
  | 'qa_promotion'
  | 'branch_cut';

export type ReleaseCalendarStatus = 'scheduled' | 'announced' | 'completed';

export type ReleaseCalendarSourceType = 'spreadsheet' | 'slack';

export interface ReleaseCalendarSource {
  readonly type: ReleaseCalendarSourceType;
  readonly spreadsheetId?: string;
  readonly sheetGid?: string;
  readonly sheetName?: string;
  readonly slackChannel?: string;
  readonly messageTs?: string;
  readonly permalink?: string;
  readonly rawText?: string;
}

export interface ReleaseCalendarEvent {
  readonly releaseLine: ReleaseLine;
  readonly product: string;
  readonly version: string;
  readonly milestone: ReleaseMilestone;
  readonly targetDate?: string;
  readonly status: ReleaseCalendarStatus;
  readonly releaseManager?: string;
  readonly source: ReleaseCalendarSource;
}

export interface SlackMessageForReleaseParse {
  readonly text: string;
  readonly channelId?: string;
  readonly channelName?: string;
  readonly messageTs?: string;
  readonly permalink?: string;
}

export const buildSpreadsheetReleaseDocumentId = ({
  releaseLine,
  version,
  milestone,
}: {
  releaseLine: ReleaseLine;
  version: string;
  milestone: ReleaseMilestone;
}): string => `${releaseLine}:${version}:${milestone}`;

export const buildSlackReleaseDocumentId = ({
  releaseLine,
  version,
  milestone,
  messageTs,
}: {
  releaseLine: ReleaseLine;
  version: string;
  milestone: ReleaseMilestone;
  messageTs: string;
}): string => `${releaseLine}:${version}:${milestone}:${messageTs}`;
