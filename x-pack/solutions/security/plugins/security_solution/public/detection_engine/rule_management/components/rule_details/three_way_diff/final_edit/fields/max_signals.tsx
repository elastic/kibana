/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FormSchema, FormData } from '../../../../../../../shared_imports';
import { UseField } from '../../../../../../../shared_imports';
import { schema } from '../../../../../../rule_creation_ui/components/step_about_rule/schema';
import type { MaxSignals as MaxSignalsType } from '../../../../../../../../common/api/detection_engine';
import { DEFAULT_MAX_SIGNALS } from '../../../../../../../../common/constants';
import { MaxSignals } from '../../../../../../rule_creation_ui/components/max_signals';

export const maxSignalsSchema = { maxSignals: schema.maxSignals } as FormSchema<{
  maxSignals: boolean;
}>;

const componentProps = {
  placeholder: DEFAULT_MAX_SIGNALS,
};

export function MaxSignalsEdit(): JSX.Element {
  return <UseField path="maxSignals" component={MaxSignals} componentProps={componentProps} />;
}

export function maxSignalsDeserializer(defaultValue: FormData) {
  return {
    maxSignals: defaultValue.max_signals,
  };
}

export function maxSignalsSerializer(formData: FormData): {
  max_signals: MaxSignalsType;
} {
  return {
    max_signals: Number.isSafeInteger(formData.maxSignals)
      ? formData.maxSignals
      : DEFAULT_MAX_SIGNALS,
  };
}
