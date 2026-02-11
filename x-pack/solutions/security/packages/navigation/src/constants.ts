/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SECURITY_UI_APP_ID = 'securitySolutionUI' as const;

export { SecurityPageName } from '@kbn/deeplinks-security';

export enum LinkCategoryType {
  title = 'title',
  collapsibleTitle = 'collapsibleTitle',
  accordion = 'accordion',
  separator = 'separator',
}

/**
 * Navigation group names.
 * They are nodes used to group links in the navigationTree but don't have a page on their own.
 * All values need to have the "securityGroup:" prefix to avoid collisions with regular `SecurityPageName`
 * since they are mixed together in the navigationTree.
 */
export enum SecurityGroupName {
  rules = 'securityGroup:rules',
  explore = 'securityGroup:explore',
  investigations = 'securityGroup:investigations',
  assets = 'securityGroup:assets',
  entityAnalytics = 'securityGroup:entityAnalytics',
  machineLearning = 'securityGroup:machineLearning',
  launchpad = 'securityGroup:launchpad',

  // TODO: https://github.com/elastic/kibana/issues/242434
  // Investigate possibility of using `detections` instead
  alertDetections = 'securityGroup:alertDetections',
}

/** This Kibana Advanced Setting allows users to enable/disable the Alerts and Attacks Alignment feature */
export const ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING =
  'securitySolution:enableAlertsAndAttacksAlignment' as const;
