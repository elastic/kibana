/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiButtonGroup } from '@elastic/eui';
import { OnboardingTopicId } from '../../constants';
import { useOnboardingContext } from '../onboarding_context';
import type { TopicConfig } from '../../types';
import { SiemMigrationSetupTour } from '../../../siem_migrations/rules/components/tours/setup_guide';
import { useUrlDetail } from '../hooks/use_url_detail';

const getLabel = (topicConfig: TopicConfig) => {
  if (topicConfig.id === OnboardingTopicId.siemMigrations) {
    return (
      <SiemMigrationSetupTour>
        <>{topicConfig.title}</>
      </SiemMigrationSetupTour>
    );
  }
  return topicConfig.title;
};

export const OnboardingHeaderTopicSelector = React.memo(() => {
  const { config } = useOnboardingContext();
  const { topicId, setTopic } = useUrlDetail();

  const selectorOptions = useMemo(
    () =>
      [...config.values()].map((topicConfig) => ({
        id: topicConfig.id,
        label: getLabel(topicConfig),
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
      onChange={(id) => setTopic(id as OnboardingTopicId)}
      isFullWidth
    />
  );
});
OnboardingHeaderTopicSelector.displayName = 'OnboardingHeaderTopicSelector';
