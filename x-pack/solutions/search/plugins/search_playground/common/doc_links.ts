/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DocLinks } from '@kbn/doc-links';

class PlaygroundDocLinks {
  public chatPlayground: string = '';
  public retrievalOptimize: string = '';
  public retrieval: string = '';
  public context: string = '';
  public hiddenFields: string = '';

  constructor() {}

  setDocLinks(newDocLinks: DocLinks) {
    this.chatPlayground = newDocLinks.playground.chatPlayground;
    this.retrievalOptimize = newDocLinks.playground.retrievalOptimize;
    this.retrieval = newDocLinks.playground.retrieval;
    this.context = newDocLinks.playground.context;
    this.hiddenFields = newDocLinks.playground.hiddenFields;
  }
}

export const docLinks = new PlaygroundDocLinks();
