/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const allowedProtocols = ['http:', 'https:'];

export const isUrlValid = (url?: string | null) => {
  if (!url) return false;

  try {
    const urlParsed = new URL(url);

    return (
      allowedProtocols.includes(urlParsed.protocol) && url.startsWith(`${urlParsed.protocol}//`)
    );
  } catch (error) {
    return false;
  }
};
