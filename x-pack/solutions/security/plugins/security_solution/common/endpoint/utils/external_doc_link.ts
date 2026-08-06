/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const MAX_LINK_LENGTH = 2048;

const ALLOWED_HOST = 'elastic.co';
const ALLOWED_HOST_SUFFIX = '.elastic.co';

export function toExternalDocLink(link: unknown): string {
  if (typeof link !== 'string') {
    return '';
  }

  const trimmed = link.trim();
  if (!trimmed || trimmed.length > MAX_LINK_LENGTH) {
    return '';
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return '';
  }

  if (url.protocol !== 'https:') {
    return '';
  }

  const host = url.hostname.toLowerCase();
  if (host !== ALLOWED_HOST && !host.endsWith(ALLOWED_HOST_SUFFIX)) {
    return '';
  }

  return trimmed;
}
