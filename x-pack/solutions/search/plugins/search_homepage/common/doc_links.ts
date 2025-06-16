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
    this.elasticCommunity = newDocLinks.elasticCommunity;
    this.elasticsearchGettingStarted = newDocLinks.elasticsearch.gettingStarted;
    this.visitSearchLabs = newDocLinks.visitSearchLabs;
    this.notebooksExamples = newDocLinks.notebooksExamples;
    this.customerEngineerRequestForm = newDocLinks.customerEngineerRequestForm;
  }
}

export const docLinks = new ESDocLinks();
