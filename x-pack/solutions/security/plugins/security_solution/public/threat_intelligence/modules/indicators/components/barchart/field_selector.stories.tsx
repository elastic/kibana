/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { StoryFn } from '@storybook/react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { RawIndicatorFieldId } from '../../../../../../common/threat_intelligence/types/indicator';
import { IndicatorsFieldSelector } from './field_selector';

export default {
  component: IndicatorsFieldSelector,
  title: 'IndicatorsFieldSelector',
};

export const Default: StoryFn = () => {
  return (
    <IndicatorsFieldSelector
      valueChange={({ label }: EuiComboBoxOptionOption<string>) =>
        window.alert(`${label} selected`)
      }
    />
  );
};

export const WithDefaultValue: StoryFn = () => {
  return (
    <IndicatorsFieldSelector
      valueChange={({ label }: EuiComboBoxOptionOption<string>) =>
        window.alert(`${label} selected`)
      }
      defaultStackByValue={RawIndicatorFieldId.LastSeen}
    />
  );
};

export const NoData: StoryFn = () => {
  return <IndicatorsFieldSelector valueChange={() => {}} />;
};
