/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback } from 'react';

import { EuiFieldText } from '@elastic/eui';

import { isPrimitiveArray } from '../../timeline/helpers';
import type { PrimitiveOrArrayOfPrimitives } from '../../../../common/lib/kuery';
import { sanatizeValue } from '../helpers';
import * as i18n from '../translations';

interface ControlledDataProviderInput {
  onChangeCallback: (value: string | number | string[]) => void;
  value: PrimitiveOrArrayOfPrimitives;
}

const VALUE_INPUT_CLASS_NAME = 'edit-data-provider-value';

export const ControlledDefaultInput = ({
  value,
  onChangeCallback,
}: ControlledDataProviderInput) => {
  const [primitiveValue, setPrimitiveValue] = useState<string | number | boolean>(
    getDefaultValue(value)
  );

  useEffect(() => {
    onChangeCallback(sanatizeValue(primitiveValue));
  }, [primitiveValue, onChangeCallback]);

  const onValueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPrimitiveValue(e.target.value);
  }, []);

  return (
    <EuiFieldText
      className={VALUE_INPUT_CLASS_NAME}
      onChange={onValueChange}
      placeholder={i18n.VALUE}
      value={sanatizeValue(primitiveValue)}
    />
  );
};

export const getDefaultValue = (value: PrimitiveOrArrayOfPrimitives): string | number | boolean => {
  if (isPrimitiveArray(value)) {
    return value[0] ?? '';
  } else return value;
};
