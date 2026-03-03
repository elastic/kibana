/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { CreateSLOInput } from '@kbn/slo-schema';
import type { RecursivePartial } from '@kbn/utility-types';
import { useHistory } from 'react-router-dom';
import { useMemo } from 'react';
import { transformPartialSLODataToFormState } from '../helpers/process_slo_form_values';
import type { CreateSLOForm } from '../types';

export function useParseUrlState(): CreateSLOForm | undefined {
  const history = useHistory();

  return useMemo(() => {
    const urlStateStorage = createKbnUrlStateStorage({
      history,
      useHash: false,
      useHashQuery: false,
    });

    const urlState = urlStateStorage.get<RecursivePartial<CreateSLOInput>>('_a') ?? undefined;

    return transformPartialSLODataToFormState(urlState);
  }, [history]);
}
