/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { Space } from '@kbn/spaces-plugin/public';

const ELASTICSEARCH_SOLUTION_VIEW = 'es';
const SEARCH_PROJECT_TYPE = 'search';

export interface IngestGateScopeDeps {
  cloud?: Pick<CloudStart, 'isServerlessEnabled' | 'serverless'>;
  spaces?: {
    isSolutionViewEnabled: boolean;
    getActiveSpace: () => Promise<Pick<Space, 'solution'>>;
  };
}

/**
 * Whether the Elasticsearch solution is the active experience: a serverless search project, or a
 * space with the Elasticsearch solution view. Other projects, solution views and classic spaces
 * are never gated.
 */
export const isElasticsearchSolutionActive = async ({
  cloud,
  spaces,
}: IngestGateScopeDeps): Promise<boolean> => {
  if (cloud?.isServerlessEnabled) {
    return cloud.serverless.projectType === SEARCH_PROJECT_TYPE;
  }
  if (!spaces?.isSolutionViewEnabled) {
    return false;
  }
  const { solution } = await spaces.getActiveSpace();
  return solution === ELASTICSEARCH_SOLUTION_VIEW;
};
