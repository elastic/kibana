/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiPanel } from '@elastic/eui';

import { SchemaType } from '../../../../../shared/schema/types';

import { Boosts } from '../../boosts';
import { Boost, SearchField } from '../../types';

import { TextSearchToggle } from './text_search_toggle';
import { WeightSlider } from './weight_slider';

interface Props {
  name: string;
  type: SchemaType;
  boosts?: Boost[];
  field?: SearchField;
}

export const RelevanceTuningItemContent: React.FC<Props> = ({ name, type, boosts, field }) => {
  return (
    <>
      <EuiPanel hasShadow={false} className="relevanceTuningAccordionItem">
        <TextSearchToggle name={name} type={type} field={field} />
        {field && <WeightSlider name={name} field={field} />}
      </EuiPanel>
      <Boosts name={name} type={type} boosts={boosts} />
    </>
  );
};
