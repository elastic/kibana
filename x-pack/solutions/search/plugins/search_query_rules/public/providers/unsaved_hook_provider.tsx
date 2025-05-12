/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { FormProvider, useForm } from 'react-hook-form';
import { QueryRuleEditorForm } from '../types';

export interface UnsavedFormProviderProps {
  children: React.ReactNode;
}
export const QueryRuleFormProvider: React.FC<React.PropsWithChildren<UnsavedFormProviderProps>> = ({
  children,
}) => {
  const form = useForm<QueryRuleEditorForm>({
    defaultValues: {
      mode: 'create',
      ruleId: '',
      rulesetId: '',
      criteria: [],
      type: 'pinned',
      actions: {
        docs: [],
      },
    },
  });
  return <FormProvider {...form}>{children}</FormProvider>;
};
