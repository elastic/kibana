/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import usePrevious from 'react-use/lib/usePrevious';
import { isNewTermsRule } from '../../../../../common/detection_engine/utils';
import type { FormHook } from '../../../../shared_imports';
import { useFormData } from '../../../../shared_imports';
import { type DefineStepRule } from '../../../../detections/pages/detection_engine/rules/types';
import {
  type NewTermsFields,
  type HistoryWindowStart,
} from '../../../../../common/api/detection_engine';

interface UsePersistentNewTermsStateParams {
  form: FormHook<DefineStepRule>;
  ruleTypePath: string;
  newTermsFieldsPath: string;
  historyWindowStartPath: string;
}

interface LastNewTermsState {
  newTermsFields: NewTermsFields;
  historyWindowStart: HistoryWindowStart;
}

export function usePersistentNewTermsState({
  form,
  ruleTypePath,
  newTermsFieldsPath,
  historyWindowStartPath,
}: UsePersistentNewTermsStateParams): void {
  const lastNewTermsState = useRef<LastNewTermsState | undefined>();
  const [formData] = useFormData({ form, watch: [newTermsFieldsPath, historyWindowStartPath] });

  const {
    [ruleTypePath]: ruleType,
    [newTermsFieldsPath]: newTermsFields,
    [historyWindowStartPath]: historyWindowStart,
  } = formData;
  const previousRuleType = usePrevious(ruleType);

  useEffect(() => {
    if (
      isNewTermsRule(ruleType) &&
      !isNewTermsRule(previousRuleType) &&
      lastNewTermsState.current
    ) {
      form.updateFieldValues({
        [newTermsFieldsPath]: lastNewTermsState.current.newTermsFields,
        [historyWindowStartPath]: lastNewTermsState.current.historyWindowStart,
      });

      return;
    }

    if (isNewTermsRule(ruleType)) {
      lastNewTermsState.current = { newTermsFields, historyWindowStart };
    }
  }, [
    form,
    ruleType,
    previousRuleType,
    newTermsFieldsPath,
    historyWindowStartPath,
    newTermsFields,
    historyWindowStart,
  ]);
}
