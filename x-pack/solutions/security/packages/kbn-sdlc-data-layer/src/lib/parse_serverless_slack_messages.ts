/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License 2.0.
 */

import type {
  ReleaseCalendarEvent,
  ReleaseMilestone,
  SlackMessageForReleaseParse,
} from './release_calendar_types';

const VERSION_REGEX = /\b(\d+\.\d+\.\d+(?:[-\w.]*)?)\b/g;
const DEPLOY_TAG_REGEX = /\b(deploy@[^\s]+)\b/i;

const QA_KEYWORDS = /\b(qa|quality assurance)\b/i;
const PRODUCTION_KEYWORDS = /\b(production|prod)\b/i;
const PROMOTION_KEYWORDS = /\b(promot(?:e|ed|ion))\b/i;
const BRANCH_CUT_KEYWORDS = /\bbranch cut\b/i;
const FEATURE_FREEZE_KEYWORDS = /\bfeature[- ]freeze\b/i;
const RELEASE_KEYWORDS = /\brelease\b/i;
const COMPLETED_KEYWORDS = /\b(completed|successfully|created|deploy tag)\b/i;

const inferMilestone = (text: string): ReleaseMilestone | undefined => {
  const normalized = text.toLowerCase();

  if (DEPLOY_TAG_REGEX.test(text)) {
    return 'deploy';
  }
  if (BRANCH_CUT_KEYWORDS.test(normalized)) {
    return 'branch_cut';
  }
  if (FEATURE_FREEZE_KEYWORDS.test(normalized)) {
    return 'feature_freeze';
  }
  if (QA_KEYWORDS.test(normalized) && (PROMOTION_KEYWORDS.test(normalized) || RELEASE_KEYWORDS.test(normalized))) {
    return 'qa_promotion';
  }
  if (PRODUCTION_KEYWORDS.test(normalized) && (PROMOTION_KEYWORDS.test(normalized) || RELEASE_KEYWORDS.test(normalized))) {
    return 'public_release';
  }
  if (RELEASE_KEYWORDS.test(normalized)) {
    return 'public_release';
  }

  return undefined;
};

const inferStatus = (text: string): ReleaseCalendarEvent['status'] => {
  if (COMPLETED_KEYWORDS.test(text)) {
    return 'completed';
  }
  return 'announced';
};

const extractVersions = (text: string): string[] => {
  const versions = new Set<string>();
  const deployMatch = text.match(DEPLOY_TAG_REGEX);
  if (deployMatch?.[1]) {
    versions.add(deployMatch[1]);
  }

  for (const match of text.matchAll(VERSION_REGEX)) {
    versions.add(match[1]);
  }

  return [...versions];
};

export const parseServerlessSlackMessage = (
  message: SlackMessageForReleaseParse
): ReleaseCalendarEvent[] => {
  const text = message.text.trim();
  if (!text) {
    return [];
  }

  const milestone = inferMilestone(text);
  if (!milestone) {
    return [];
  }

  const versions = extractVersions(text);
  if (versions.length === 0) {
    return [];
  }

  const status = inferStatus(text);
  const source = {
    type: 'slack' as const,
    slackChannel: message.channelName,
    messageTs: message.messageTs,
    permalink: message.permalink,
    rawText: text,
  };

  return versions.map((version) => ({
    releaseLine: 'serverless' as const,
    product: 'kibana',
    version,
    milestone,
    status,
    source,
  }));
};

export const parseServerlessSlackMessages = (
  messages: SlackMessageForReleaseParse[]
): ReleaseCalendarEvent[] =>
  messages.flatMap((message) => parseServerlessSlackMessage(message));
