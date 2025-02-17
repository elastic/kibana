/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Story } from '@storybook/react';
import { EuiComboBoxOptionOption } from '@elastic/eui';
import { RawIndicatorFieldId } from '../../../../../common/types/indicator';
import { IndicatorsFieldSelector } from './field_selector';

export default {
  component: IndicatorsFieldSelector,
  title: 'IndicatorsFieldSelector',
};

export const Default: Story<void> = () => {
  return (
    <IndicatorsFieldSelector
      valueChange={({ label }: EuiComboBoxOptionOption<string>) =>
        window.alert(`${label} selected`)
      }
    />
  );
};

export const WithDefaultValue: Story<void> = () => {
  return (
    <IndicatorsFieldSelector
      valueChange={({ label }: EuiComboBoxOptionOption<string>) =>
        window.alert(`${label} selected`)
      }
      defaultStackByValue={RawIndicatorFieldId.LastSeen}
    />
  );
};

export const NoData: Story<void> = () => {
  return <IndicatorsFieldSelector valueChange={() => {}} />;
};
