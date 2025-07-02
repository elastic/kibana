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
  public elasticsearchDocs: string = '';
  public visitSearchLabs: string = '';
  public notebooksExamples: string = '';
  public customerEngineerRequestForm: string = '';
  public analyzeLogs: string = '';
  public ingestDataToSecurity: string = '';
  public cloudSecurityPosture: string = '';
  public installElasticDefend: string = '';
  constructor() {}

  setDocLinks(newDocLinks: DocLinks) {
    this.kibanaFeedback = newDocLinks.kibana.feedback;
    this.elasticCommunity = newDocLinks.searchHomepage.elasticCommunity;
    this.elasticsearchDocs = newDocLinks.elasticsearch.gettingStarted;
    this.visitSearchLabs = newDocLinks.searchHomepage.visitSearchLabs;
    this.notebooksExamples = newDocLinks.searchHomepage.notebooksExamples;
    this.analyzeLogs = newDocLinks.serverlessSearch.integrations;
    this.customerEngineerRequestForm = newDocLinks.searchHomepage.customerEngineerRequestForm;
    this.ingestDataToSecurity = newDocLinks.siem.ingestDataToSecurity;
    this.cloudSecurityPosture = newDocLinks.securitySolution.cloudSecurityPosture;
    this.installElasticDefend = newDocLinks.securitySolution.installElasticDefend;
  }
}

export const docLinks = new ESDocLinks();
