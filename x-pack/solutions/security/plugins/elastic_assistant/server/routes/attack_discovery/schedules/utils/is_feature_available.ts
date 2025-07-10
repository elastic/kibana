/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ATTACK_DISCOVERY_SCHEDULES_ENABLED_FEATURE_FLAG } from '@kbn/elastic-assistant-common';
import { AwaitedProperties } from '@kbn/utility-types';

import { ElasticAssistantRequestHandlerContext } from '../../../../types';

export const isFeatureAvailable = async (
  context: AwaitedProperties<Pick<ElasticAssistantRequestHandlerContext, 'core'>>
): Promise<boolean> => {
  return context.core.featureFlags.getBooleanValue(
    ATTACK_DISCOVERY_SCHEDULES_ENABLED_FEATURE_FLAG,
    false
  );
};
