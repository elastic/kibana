/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MAX_FEED_MIRROR_URL_LENGTH = 2048;

/** Why a `feedMirrorUrl` cannot be used, or undefined when it can. */
export const feedMirrorUrlProblem = (mirror: string): string | undefined => {
  if (mirror.length > MAX_FEED_MIRROR_URL_LENGTH) {
    return `must be at most ${MAX_FEED_MIRROR_URL_LENGTH} characters`;
  }
  const { username, password } = new URL(mirror);
  // fetch refuses a URL that carries credentials, so every download would fail at run time.
  if (username || password) return 'must not contain credentials';
  // Raw value on purpose: URL parsing drops an empty `?` or `#`, which would still be glued on.
  if (mirror.includes('?') || mirror.includes('#')) {
    return 'must not contain a query string or fragment';
  }
  return undefined;
};

/** Maps a vendor URL to `<mirror>/<host>/<path><query>`, the layout `wget -x` writes. */
export const resolveFeedUrl = (url: string, mirror?: string): string => {
  if (!mirror) return url;
  const { host, pathname, search } = new URL(url);
  return `${mirror.replace(/\/+$/, '')}/${host}${pathname}${search}`;
};
