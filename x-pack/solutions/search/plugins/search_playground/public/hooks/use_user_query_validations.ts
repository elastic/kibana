/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form/dist/types';
import { useDebounceFn } from '@kbn/react-hooks';

import { PlaygroundForm, PlaygroundFormFields } from '../types';
import { validateUserElasticSearchQuery } from '../utils/user_query';

const DEBOUNCE_OPTIONS = { wait: 500 };
export const useUserQueryValidations = ({
  watch,
  setValue,
  getValues,
}: Pick<UseFormReturn<PlaygroundForm>, 'watch' | 'getValues' | 'setValue'>) => {
  const userElasticsearchQuery = watch(PlaygroundFormFields.userElasticsearchQuery);
  const elasticsearchQuery = watch(PlaygroundFormFields.elasticsearchQuery);

  const userQueryValidation = useDebounceFn(() => {
    const [esQuery, userInputQuery] = getValues([
      PlaygroundFormFields.elasticsearchQuery,
      PlaygroundFormFields.userElasticsearchQuery,
    ]);
    const validations = validateUserElasticSearchQuery(userInputQuery, esQuery);
    setValue(PlaygroundFormFields.userElasticsearchQueryValidations, validations);
  }, DEBOUNCE_OPTIONS);
  useEffect(() => {
    userQueryValidation.run();
  }, [elasticsearchQuery, userElasticsearchQuery, userQueryValidation]);
};
