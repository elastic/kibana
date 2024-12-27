/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions } from 'kea';

import { RelevanceTuningLogic } from '../..';
import { MultiInputRows } from '../../../multi_input_rows';

import { ValueBoost } from '../../types';

interface Props {
  boost: ValueBoost;
  index: number;
  name: string;
}

export const ValueBoostForm: React.FC<Props> = ({ boost, index, name }) => {
  const { updateBoostValue } = useActions(RelevanceTuningLogic);
  const values = boost.value;

  return (
    <MultiInputRows
      initialValues={values}
      onChange={(updatedValues) => updateBoostValue(name, index, updatedValues)}
      id={`${name}BoostValue-${index}`}
    />
  );
};
