/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { useFetchSloTemplate } from '../../../hooks/use_fetch_slo_template';
import { transformPartialSLODataToFormState } from '../helpers/process_slo_form_values';

export function useParseTemplateId() {
  const history = useHistory();

  const templateId = useMemo(() => {
    const urlStateStorage = createKbnUrlStateStorage({
      history,
      useHash: false,
      useHashQuery: false,
    });

    return urlStateStorage.get<string>('fromTemplateId') ?? undefined;
  }, [history]);

  const { data: template, isInitialLoading } = useFetchSloTemplate(templateId);

  return { isInitialLoading, data: transformPartialSLODataToFormState(template) };
}
