/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudStart } from '@kbn/cloud-plugin/public';
import { SECURITY_PROJECT_TYPE } from '../../common';

export type GetCloudUrl = (cloudUrlKey: string, cloud: CloudStart) => string | undefined;

export const isCloudLink = (linkId: string): boolean => linkId.startsWith('cloud:');
export const getCloudLinkKey = (linkId: string): string => linkId.replace('cloud:', '');

export const getProjectId = (cloud: CloudStart) => cloud.serverless?.projectId;
export const getProjectFeaturesUrl = (cloud: CloudStart): string | undefined => {
  const projectsBaseUrl = getCloudUrl('projects', cloud);
  const projectId = getProjectId(cloud);
  if (!projectsBaseUrl || !projectId) {
    return undefined;
  }
  return `${projectsBaseUrl}${SECURITY_PROJECT_TYPE}/${projectId}?open=securityProjectFeatures`;
};

export const getCloudUrl: GetCloudUrl = (cloudUrlKey, cloud) => {
  const cloudUrls = cloud.getUrls();

  switch (cloudUrlKey) {
    case 'deployment':
      return cloudUrls.deploymentUrl;
    case 'organization':
      return cloudUrls.organizationUrl;
    case 'performance':
      return cloudUrls.performanceUrl;
    case 'profile':
      return cloudUrls.profileUrl;
    case 'usersAndRoles':
      return cloudUrls.usersAndRolesUrl;
    case 'projects':
      return cloudUrls.projectsUrl;
    default:
      return undefined;
  }
};
