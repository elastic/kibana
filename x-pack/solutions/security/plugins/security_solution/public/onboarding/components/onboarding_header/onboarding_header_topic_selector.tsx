/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiButtonGroup } from '@elastic/eui';
import type { OnboardingTopicId } from '../../constants';
import { useOnboardingContext } from '../onboarding_context';
import { useTopic } from '../hooks/use_topic_id';

export const OnboardingHeaderTopicSelector = React.memo(() => {
  const { config } = useOnboardingContext();
  const [topicId, setTopicId] = useTopic();

  const selectorOptions = useMemo(
    () =>
      [...config.values()].map((topicConfig) => ({
        id: topicConfig.id,
        label: topicConfig.title,
      })),
    [config]
  );

  if (selectorOptions.length < 2) {
    return null;
  }

  return (
    <EuiButtonGroup
      className="onboardingHeaderTopicSelector"
      buttonSize="compressed"
      type="single"
      legend="Topic selector"
      options={selectorOptions}
      idSelected={topicId}
      onChange={(id) => setTopicId(id as OnboardingTopicId)}
      isFullWidth
    />
  );
});
OnboardingHeaderTopicSelector.displayName = 'OnboardingHeaderTopicSelector';
