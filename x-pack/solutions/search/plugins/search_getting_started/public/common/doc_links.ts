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
  public elasticTraining: string = '';
  public serverlessReleaseNotes: string = '';
  public hostedCloudReleaseNotes: string = '';
  public askAnExpert: string = '';
  public cloudHome: string = '';
  public cloudUsage: string = '';
  public cloudOrganizationMembers: string = '';
  public cloudManageSubscription: string = '';

  constructor() {}

  setDocLinks(newDocLinks: DocLinks) {
    this.elasticsearchDocs = newDocLinks.elasticsearch.gettingStarted;
    this.visitSearchLabs = newDocLinks.searchGettingStarted.visitSearchLabs;
    this.notebooksExamples = newDocLinks.searchGettingStarted.notebooksExamples;
    this.elasticTraining = newDocLinks.searchGettingStarted.elasticTraining;
    this.serverlessReleaseNotes = newDocLinks.serverlessReleaseNotes;
    this.hostedCloudReleaseNotes = newDocLinks.hostedCloudReleaseNotes;
    this.askAnExpert = newDocLinks.searchHomepage.customerEngineerRequestForm;
    this.cloudHome = newDocLinks.searchGettingStarted.cloudHome;
    this.cloudUsage = newDocLinks.searchGettingStarted.cloudUsage;
    this.cloudOrganizationMembers = newDocLinks.searchGettingStarted.cloudOrganizationMembers;
    this.cloudManageSubscription = newDocLinks.searchGettingStarted.cloudManageSubscription;
  }
}

export const docLinks = new ESDocLinks();
