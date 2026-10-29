/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const CHANNEL_ID = /^[CG][A-Z0-9]{8,}$/;
const CHANNEL_PATH_SEGMENTS = [/^archives$/, /^client$/];

/** Extracts a Slack channel id from an id or a channel link. */
export const parseSlackChannelInput = (input: string): string | undefined => {
  const value = input.trim();
  if (CHANNEL_ID.test(value)) return value;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return undefined;
  }
  if (url.protocol !== 'https:' || !/(^|\.)slack\.com$/.test(url.hostname)) return undefined;

  const segments = url.pathname.split('/').filter(Boolean);
  if (!CHANNEL_PATH_SEGMENTS.some((pattern) => pattern.test(segments[0] ?? ''))) return undefined;
  const channel = segments.find((segment, index) => index > 0 && CHANNEL_ID.test(segment));
  return channel;
};
