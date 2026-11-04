/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const parse = (url: string): URL | undefined => {
  try {
    return new URL(url);
  } catch {
    return undefined;
  }
};

/**
 * The file a URL points at, e.g. `app.js`, with its host when it is another origin than
 * `pageOrigin`; the path for URLs that end with a slash.
 */
export const toUrlFileName = (url: string, pageOrigin?: string): string => {
  const parsed = parse(url);
  if (!parsed) {
    return url;
  }
  const fileName = parsed.pathname.split('/').pop() || parsed.pathname;
  return pageOrigin && parsed.origin !== pageOrigin ? `${parsed.host}/…/${fileName}` : fileName;
};

/** The origin of a URL, e.g. `https://shop.example.com`, `undefined` when it does not parse. */
export const toUrlOrigin = (url: string): string | undefined => {
  return parse(url)?.origin;
};

/** The origin most of the URLs share, e.g. the application's own among its resources. */
export const toMostCommonOrigin = (urls: string[]): string | undefined => {
  const counts = new Map<string, number>();
  urls.forEach((url) => {
    const origin = toUrlOrigin(url);
    if (origin) {
      counts.set(origin, (counts.get(origin) ?? 0) + 1);
    }
  });
  return [...counts.entries()].sort(([, a], [, b]) => {
    return b - a;
  })[0]?.[0];
};
