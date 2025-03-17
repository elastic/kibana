/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { StoryProvidersComponent } from '../../../../mocks/story_providers';
import { generateMockIndicator } from '../../../../../common/types/indicator';
import { IndicatorFieldValue } from './field_value';

export default {
  component: IndicatorFieldValue,
  title: 'IndicatorFieldValue',
};

const mockIndicator = generateMockIndicator();

export function Default() {
  const mockField = 'threat.indicator.ip';

  return <IndicatorFieldValue indicator={mockIndicator} field={mockField} />;
}

export function IncorrectField() {
  const mockField = 'abc';

  return <IndicatorFieldValue indicator={mockIndicator} field={mockField} />;
}

export function HandlesDates() {
  const mockField = 'threat.indicator.first_seen';

  return (
    <StoryProvidersComponent>
      <IndicatorFieldValue indicator={mockIndicator} field={mockField} />
    </StoryProvidersComponent>
  );
}
