/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FeatureFeedbackButton } from '@kbn/observability-shared-plugin/public';
import { useLocation } from 'react-router-dom';
import { useKibanaEnvironmentContext } from '../../../../hooks/use_kibana';

import { SurveyKubernetes } from './survey_kubernetes';

const INVENTORY_FEEDBACK_LINK = 'https://ela.st/survey-infra-inventory';

export const SurveySection = () => {
  const { search } = useLocation();

  const { kibanaVersion, isCloudEnv, isServerlessEnv } = useKibanaEnvironmentContext();

  return (
    <>
      {search.includes('nodeType:pod') ? (
        <SurveyKubernetes />
      ) : (
        <FeatureFeedbackButton
          data-test-subj="infraInventoryFeedbackLink"
          formUrl={INVENTORY_FEEDBACK_LINK}
          kibanaVersion={kibanaVersion}
          isCloudEnv={isCloudEnv}
          isServerlessEnv={isServerlessEnv}
          sanitizedPath={document.location.pathname}
        />
      )}
    </>
  );
};
