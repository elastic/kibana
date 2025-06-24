/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useOnboardingContext } from '../../onboarding_context';
import { useTopicId } from '../../hooks/use_topic_id';
import type { OnboardingGroupConfig } from '../../../types';

/**
 * Hook that returns the body config for the selected topic
 */
export const useBodyConfig = (): OnboardingGroupConfig[] => {
  const topicId = useTopicId();
  const { config } = useOnboardingContext();
  const topicBodyConfig = useMemo(() => {
    let bodyConfig: OnboardingGroupConfig[] = [];
    const topicConfig = config.get(topicId);
    // The selected topic should always exist in the config, but we check just in case
    if (topicConfig) {
      bodyConfig = topicConfig.body;
    }
    return bodyConfig;
  }, [config, topicId]);

  return topicBodyConfig;
};
