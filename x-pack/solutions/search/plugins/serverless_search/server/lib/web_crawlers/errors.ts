/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class WebCrawlerError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
  }
}

export const notFound = (id: string) => new WebCrawlerError(`Web crawler ${id} not found`, 404);

export const agentUnavailable = (id: string) =>
  new WebCrawlerError(`Web crawler ${id} has no running agent to send the crawl request to`, 409);
