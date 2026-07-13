/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface TargetContext {
  targetType: string;
  targetId: string;
}

export interface ResolveTargetInput {
  cloudSetup?: {
    isServerlessEnabled?: boolean;
    deploymentId?: string;
    serverless?: { projectId?: string };
  };
  config?: { targetType?: string; targetId?: string };
}

export const resolveTargetContext = (input: ResolveTargetInput): TargetContext | undefined => {
  const { cloudSetup, config } = input;

  if (cloudSetup?.isServerlessEnabled && cloudSetup.serverless?.projectId) {
    return { targetType: 'serverless', targetId: cloudSetup.serverless.projectId };
  }

  if (cloudSetup?.deploymentId) {
    return { targetType: 'hosted', targetId: cloudSetup.deploymentId };
  }

  if (config?.targetType && config.targetId) {
    return { targetType: config.targetType, targetId: config.targetId };
  }

  return undefined;
};
