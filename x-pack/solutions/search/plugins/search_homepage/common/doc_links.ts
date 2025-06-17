/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DocLinks } from '@kbn/doc-links';

class ESDocLinks {
  public kibanaFeedback: string = '';
  public elasticCommunity: string = '';
  public elasticsearchGettingStarted: string = '';
  public visitSearchLabs: string = '';
  public notebooksExamples: string = '';
  public customerEngineerRequestForm: string = '';
  constructor() {}

  setDocLinks(newDocLinks: DocLinks) {
    this.kibanaFeedback = newDocLinks.kibana.feedback;
    this.elasticCommunity = newDocLinks.searchHomepage.elasticCommunity;
    this.elasticsearchGettingStarted = newDocLinks.elasticsearch.gettingStarted;
    this.visitSearchLabs = newDocLinks.searchHomepage.visitSearchLabs;
    this.notebooksExamples = newDocLinks.searchHomepage.notebooksExamples;
    this.customerEngineerRequestForm = newDocLinks.searchHomepage.customerEngineerRequestForm;
  }
}

export const docLinks = new ESDocLinks();
