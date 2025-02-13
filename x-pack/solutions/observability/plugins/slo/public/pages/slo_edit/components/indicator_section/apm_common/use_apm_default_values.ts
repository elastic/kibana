/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFormContext } from 'react-hook-form';
import { ALL_VALUE, APMTransactionErrorRateIndicator } from '@kbn/slo-schema';
import { useEffect } from 'react';
import { useFetchApmIndex } from '../../../../../hooks/use_fetch_apm_indices';
import { CreateSLOForm } from '../../../types';

export const useApmDefaultValues = () => {
  const { watch, setValue } = useFormContext<CreateSLOForm<APMTransactionErrorRateIndicator>>();
  const { data: apmIndex } = useFetchApmIndex();

  const [serviceName = '', environment = '', transactionType = '', transactionName = ''] = watch([
    'indicator.params.service',
    'indicator.params.environment',
    'indicator.params.transactionType',
    'indicator.params.transactionName',
  ]);

  useEffect(() => {
    if (apmIndex !== '') {
      setValue('indicator.params.index', apmIndex);
    }
  }, [setValue, apmIndex]);

  useEffect(() => {
    if (serviceName) {
      if (!environment) {
        setValue('indicator.params.environment', ALL_VALUE);
      }

      if (!transactionType) {
        setValue('indicator.params.transactionType', ALL_VALUE);
      }

      if (!transactionName) {
        setValue('indicator.params.transactionName', ALL_VALUE);
      }
    }
  }, [environment, serviceName, setValue, transactionName, transactionType]);
};
