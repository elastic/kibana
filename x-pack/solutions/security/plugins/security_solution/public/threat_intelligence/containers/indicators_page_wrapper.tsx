/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { IndicatorsPage } from '../modules/indicators/pages/indicators';
import { IntegrationsGuard } from './integrations_guard';
import { SecuritySolutionTemplateWrapper } from '../../app/home/template_wrapper';

export const IndicatorsPageWrapper: FC = () => {
  return (
    <IntegrationsGuard>
      <SecuritySolutionTemplateWrapper>
        <IndicatorsPage />
      </SecuritySolutionTemplateWrapper>
    </IntegrationsGuard>
  );
};

// Note: This is for lazy loading
// eslint-disable-next-line import/no-default-export
export default memo(IndicatorsPageWrapper);
