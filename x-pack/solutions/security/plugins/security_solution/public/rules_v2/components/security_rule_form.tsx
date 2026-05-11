/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useForm, FormProvider } from 'react-hook-form';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_RULE_API_PATH } from '@kbn/alerting-v2-constants';
import type { FormValues, RuleFormServices } from '@kbn/alerting-v2-rule-form';
import {
  RuleFormProvider,
  RulePreviewPanel,
  useFormDefaults,
  mapFormValuesToCreateRequest,
  mapFormValuesToUpdateRequest,
} from '@kbn/alerting-v2-rule-form';
import { DEFAULT_INDEX_PATTERN } from '../../../common/constants';
import type { SecurityRuleType } from '../constants';
import { buildThresholdEsqlQuery, parseThresholdEsqlQuery } from '../utils/threshold_to_esql';
import { SecurityGuiRuleForm } from './security_gui_rule_form';

const DEFAULT_THRESHOLD_VALUE = 200;

const SECURITY_OVERRIDES: Pick<
  FormValues,
  'kind' | 'recoveryPolicy' | 'stateTransition' | 'stateTransitionAlertDelayMode' | 'stateTransitionRecoveryDelayMode'
> = {
  kind: 'alert',
  recoveryPolicy: { type: 'no_breach' },
  stateTransition: { pendingCount: 0, recoveringCount: 0 },
  stateTransitionAlertDelayMode: 'immediate',
  stateTransitionRecoveryDelayMode: 'immediate',
};

interface SecurityRuleFormProps {
  services: RuleFormServices;
  ruleId?: string;
  initialValues?: Partial<FormValues>;
  initialQuery?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

/**
 * Security-specific rule form that owns its own react-hook-form, react-query,
 * and RuleFormProvider contexts. Composes platform field groups via
 * SecurityGuiRuleForm instead of wrapping StandaloneRuleForm.
 */
export const SecurityRuleForm = ({
  services,
  ruleId,
  initialValues,
  initialQuery,
  onSuccess,
  onCancel,
}: SecurityRuleFormProps) => {
  const inferredType: SecurityRuleType =
    initialValues?.metadata?.tags?.includes('threshold') ? 'threshold' : 'esql';
  const [ruleType, setRuleType] = useState<SecurityRuleType>(ruleId ? inferredType : 'esql');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const parsedThreshold = useMemo(
    () => (ruleId && inferredType === 'threshold' && initialQuery
      ? parseThresholdEsqlQuery(initialQuery)
      : null),
    [ruleId, inferredType, initialQuery]
  );

  const [indexPatterns, setIndexPatterns] = useState<string[]>(
    parsedThreshold?.indexPatterns ?? DEFAULT_INDEX_PATTERN
  );
  const [groupByFields, setGroupByFields] = useState<string[]>(
    parsedThreshold?.thresholdFields ?? []
  );
  const [thresholdValue, setThresholdValue] = useState(
    parsedThreshold?.thresholdValue ?? DEFAULT_THRESHOLD_VALUE
  );
  const [cardinalityField, setCardinalityField] = useState(
    parsedThreshold?.cardinalityField ?? ''
  );
  const [cardinalityValue, setCardinalityValue] = useState(
    parsedThreshold?.cardinalityValue ?? 0
  );

  const generatedQuery = useMemo(() => {
    if (ruleType !== 'threshold' || indexPatterns.length === 0) {
      return '';
    }
    return buildThresholdEsqlQuery({
      indexPatterns,
      thresholdFields: groupByFields,
      thresholdValue,
      cardinalityField: cardinalityField || undefined,
      cardinalityValue: cardinalityField ? cardinalityValue : undefined,
    });
  }, [ruleType, indexPatterns, groupByFields, thresholdValue, cardinalityField, cardinalityValue]);

  const defaultFromClause = `FROM ${DEFAULT_INDEX_PATTERN.join(', ')}`;

  const effectiveQuery = useMemo(() => {
    if (ruleType === 'threshold') {
      return generatedQuery || defaultFromClause;
    }
    return initialQuery ?? initialValues?.evaluation?.query?.base ?? defaultFromClause;
  }, [ruleType, generatedQuery, initialQuery, initialValues, defaultFromClause]);

  const queryDefaults = useFormDefaults({ query: effectiveQuery });

  const defaultValues = useMemo<FormValues>(() => {
    const securityDefaults: Partial<FormValues> = {
      ...SECURITY_OVERRIDES,
      ...initialValues,
    };

    if (ruleType === 'threshold' && generatedQuery) {
      securityDefaults.evaluation = { query: { base: generatedQuery } };
    }

    return {
      ...queryDefaults,
      ...securityDefaults,
      metadata: {
        ...queryDefaults.metadata,
        ...securityDefaults.metadata,
      },
      schedule: {
        ...queryDefaults.schedule,
        ...securityDefaults.schedule,
      },
      evaluation: {
        ...queryDefaults.evaluation,
        query: {
          ...queryDefaults.evaluation.query,
          ...securityDefaults.evaluation?.query,
        },
      },
      ...(securityDefaults.grouping !== undefined ? { grouping: securityDefaults.grouping } : {}),
      ...(securityDefaults.recoveryPolicy !== undefined
        ? { recoveryPolicy: securityDefaults.recoveryPolicy }
        : {}),
      ...(securityDefaults.stateTransition !== undefined
        ? { stateTransition: securityDefaults.stateTransition }
        : {}),
      stateTransitionAlertDelayMode:
        securityDefaults.stateTransitionAlertDelayMode ?? queryDefaults.stateTransitionAlertDelayMode,
      stateTransitionRecoveryDelayMode:
        securityDefaults.stateTransitionRecoveryDelayMode ?? queryDefaults.stateTransitionRecoveryDelayMode,
    };
  }, [queryDefaults, initialValues, ruleType, generatedQuery]);

  const methods = useForm<FormValues>({
    mode: 'onBlur',
    defaultValues,
  });

  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, refetchOnWindowFocus: false },
        },
      }),
    []
  );

  const meta = useMemo(() => ({ layout: 'page' as const }), []);

  const handleSubmit = useCallback(
    async (values: FormValues) => {
      const enriched: FormValues = {
        ...values,
        ...SECURITY_OVERRIDES,
      };

      const securityTag = ruleType === 'threshold' ? 'threshold' : 'esql';
      const existingTags = enriched.metadata.tags ?? [];
      enriched.metadata = {
        ...enriched.metadata,
        owner: 'siem',
        tags: [
          ...existingTags.filter((t) => t !== 'security' && t !== 'threshold' && t !== 'esql'),
          'security',
          securityTag,
        ],
      };

      if (ruleType === 'threshold' && generatedQuery) {
        enriched.evaluation = { query: { base: generatedQuery } };
      }

      setIsSubmitting(true);
      try {
        if (ruleId) {
          await services.http.patch<RuleResponse>(`${ALERTING_V2_RULE_API_PATH}/${ruleId}`, {
            body: JSON.stringify(mapFormValuesToUpdateRequest(enriched)),
          });
          services.notifications.toasts.addSuccess(`Rule '${enriched.metadata.name}' updated`);
        } else {
          await services.http.post<RuleResponse>(ALERTING_V2_RULE_API_PATH, {
            body: JSON.stringify(mapFormValuesToCreateRequest(enriched)),
          });
          services.notifications.toasts.addSuccess(`Rule '${enriched.metadata.name}' created`);
        }
        onSuccessRef.current?.();
      } catch (error) {
        services.notifications.toasts.addDanger(
          `Error ${ruleId ? 'updating' : 'creating'} rule: ${error instanceof Error ? error.message : String(error)}`
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [ruleType, generatedQuery, ruleId, services]
  );

  return (
    <QueryClientProvider client={queryClient}>
      <RuleFormProvider services={services} meta={meta}>
        <FormProvider {...methods}>
          <EuiFlexGroup gutterSize="l" alignItems="flexStart" key={`${ruleType}-${generatedQuery}`}>
            <EuiFlexItem grow={1} style={{ minWidth: 0 }}>
              <SecurityGuiRuleForm
                onSubmit={handleSubmit}
                ruleType={ruleType}
                onRuleTypeChange={setRuleType}
                isUpdateView={Boolean(ruleId)}
                isSubmitting={isSubmitting}
                onCancel={onCancel}
                ruleId={ruleId}
                indexPatterns={indexPatterns}
                onIndexPatternsChange={setIndexPatterns}
                groupByFields={groupByFields}
                onGroupByFieldsChange={setGroupByFields}
                thresholdValue={thresholdValue}
                onThresholdValueChange={setThresholdValue}
                cardinalityField={cardinalityField}
                onCardinalityFieldChange={setCardinalityField}
                cardinalityValue={cardinalityValue}
                onCardinalityValueChange={setCardinalityValue}
                generatedQuery={generatedQuery}
                search={services.data.search.search}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={1} style={{ minWidth: 0 }}>
              <RulePreviewPanel />
            </EuiFlexItem>
          </EuiFlexGroup>
        </FormProvider>
      </RuleFormProvider>
    </QueryClientProvider>
  );
};
