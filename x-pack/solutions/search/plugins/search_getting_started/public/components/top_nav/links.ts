/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
const cloudDeployment = 'https://cloud.elastic.co/';
export enum cloudLinks {
  cloudHome = `${cloudDeployment}home`,
  cloudUsage = `${cloudDeployment}billing/usage`,
  cloudOrganizationMembers = `${cloudDeployment}account/members`,
  cloudManageSubscription = `${cloudDeployment}billing/overview`,
}
