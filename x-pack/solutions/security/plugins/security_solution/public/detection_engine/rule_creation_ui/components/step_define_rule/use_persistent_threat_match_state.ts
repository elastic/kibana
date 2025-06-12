/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import usePrevious from 'react-use/lib/usePrevious';
import type { ThreatMapping } from '@kbn/securitysolution-io-ts-alerting-types';
import type { DefineStepRule } from '../../../common/types';
import { isThreatMatchRule } from '../../../../../common/detection_engine/utils';
import type { FormHook } from '../../../../shared_imports';
import { useFormData } from '../../../../shared_imports';
import type { FieldValueQueryBar } from '../query_bar_field';

interface UsePersistentThreatMatchStateParams {
  form: FormHook<DefineStepRule>;
}

interface LastThreatMatchState {
  threatIndexPatterns: string[] | undefined;
  threatQueryBar: FieldValueQueryBar | undefined;
  threatMapping: ThreatMapping | undefined;
}

/**
 * Persists threat match form data when switching between threat match and the other rule types.
 */
export function usePersistentThreatMatchState({ form }: UsePersistentThreatMatchStateParams): void {
  const lastThreatMatchState = useRef<LastThreatMatchState | undefined>();
  const [{ ruleType, threatIndex: threatIndexPatterns, threatQueryBar, threatMapping }] =
    useFormData<DefineStepRule>({
      form,
      watch: ['ruleType', 'threatIndex', 'threatQueryBar', 'threatMapping'],
    });
  const previousRuleType = usePrevious(ruleType);

  useEffect(() => {
    if (
      isThreatMatchRule(ruleType) &&
      !isThreatMatchRule(previousRuleType) &&
      lastThreatMatchState.current
    ) {
      form.updateFieldValues({
        threatIndex: lastThreatMatchState.current.threatIndexPatterns,
        threatQueryBar: lastThreatMatchState.current.threatQueryBar,
        threatMapping: lastThreatMatchState.current.threatMapping,
      });

      return;
    }

    if (isThreatMatchRule(ruleType)) {
      lastThreatMatchState.current = { threatIndexPatterns, threatQueryBar, threatMapping };
    }
  }, [form, ruleType, previousRuleType, threatIndexPatterns, threatQueryBar, threatMapping]);
}
