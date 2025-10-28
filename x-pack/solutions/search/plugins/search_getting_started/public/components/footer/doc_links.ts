/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocLinks } from '@kbn/doc-links';

class ESDocLinks {
  public visitSearchLabs: string = '';
  public notebooksExamples: string = '';
  public elasticsearchDocs: string = '';

  constructor() {}

  setDocLinks(newDocLinks: DocLinks) {
    this.elasticsearchDocs = newDocLinks.elasticsearch.gettingStarted;
    this.visitSearchLabs = newDocLinks.searchGettingStarted.visitSearchLabs;
    this.notebooksExamples = newDocLinks.searchGettingStarted.notebooksExamples;
  }
}

export const docLinks = new ESDocLinks();
