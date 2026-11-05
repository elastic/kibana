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
  const { host, origin, pathname } = parsed;
  const isOtherOrigin = pageOrigin !== undefined && origin !== pageOrigin;
  if (pathname.endsWith('/')) {
    return isOtherOrigin ? `${host}${pathname}` : pathname;
  }
  const fileName = pathname.slice(pathname.lastIndexOf('/') + 1);
  return isOtherOrigin ? `${host}/…/${fileName}` : fileName;
};
