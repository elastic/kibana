/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { FormProvider, useForm } from 'react-hook-form';
import { QueryRulesetDetailForm } from '../types';

export interface QueryRuleFlyoutFormProvider {
  children: React.ReactNode;
}
export const QueryRuleFlyoutFormProvider: React.FC<
  React.PropsWithChildren<QueryRuleFlyoutFormProvider>
> = ({ children }) => {
  const form = useForm<QueryRulesetDetailForm>({
    defaultValues: {
      flyoutForm: {
        mode: 'create',
        ruleId: '',
        rulesetId: '',
        criteria: [],
        type: 'pinned',
        actions: {
          docs: [],
        },
      },
      rulesetForm: {
        mode: 'create',
        rulesetId: '',
        rules: [],
      },
    },
  });
  return <FormProvider {...form}>{children}</FormProvider>;
};
