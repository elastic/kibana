/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCloudUrl } from '../navigation/util';
import type { Services } from '../common/services';
import { ProductLine } from '../../common/product';

export const setOnboardingSettings = (services: Services) => {
  const { securitySolution, cloud } = services;
  const projectId = cloud.serverless?.projectId;

  securitySolution.setOnboardingSettings({
    userUrl: getCloudUrl('usersAndRoles', cloud),
    projectUrl: projectId
      ? `${getCloudUrl('projects', cloud)}${`${ProductLine.security}/${projectId}`}`
      : undefined,
    isAgentlessAvailable: true,
  });
};
