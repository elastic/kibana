/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { FormProvider, useForm } from 'react-hook-form';
import { QueryRulesetDetailForm } from '../types';

interface QueryRulesetDetailFormProvider {
  children: React.ReactNode;
}

export const QueryRulesetDetailsForm: React.FC<
  React.PropsWithChildren<QueryRulesetDetailFormProvider>
> = ({ children }) => {
  const form = useForm<QueryRulesetDetailForm>({
    defaultValues: {
      mode: 'create',
      rulesetId: '',
      rules: [],
    },
  });

  return <FormProvider {...form}> {children}</FormProvider>;
};
