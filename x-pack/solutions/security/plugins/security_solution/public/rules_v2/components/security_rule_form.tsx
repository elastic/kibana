/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { EuiSpacer } from '@elastic/eui';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_RULE_API_PATH } from '@kbn/alerting-v2-constants';
import type {
  FormValues,
  RuleFormServices,
} from '@kbn/alerting-v2-rule-form';
import {
  StandaloneRuleForm,
  mapFormValuesToCreateRequest,
  mapFormValuesToUpdateRequest,
} from '@kbn/alerting-v2-rule-form';
import { DEFAULT_INDEX_PATTERN } from '../../../common/constants';
import type { SecurityRuleType } from '../constants';
import * as i18n from '../translations';
import { RuleTypeSwitcher } from './rule_type_switcher';
import { ThresholdFields } from './threshold_fields';
import { buildThresholdEsqlQuery, parseThresholdEsqlQuery } from '../utils/threshold_to_esql';

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
  /** Initial ES|QL query for the platform form (from loaded rule on edit). */
  initialQuery?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

/**
 * Security-specific rule creation form that wraps the platform alerting v2 form.
 *
 * Supports two rule types:
 * - ES|QL: renders the full platform form with the ES|QL editor
 * - Threshold: renders security-specific threshold fields, converts to ES|QL,
 *   and passes the generated query to the platform form (read-only query view)
 *
 * Hardcodes security-specific defaults:
 * - kind: 'alert' (always lifecycle-managed)
 * - recovery_policy: { type: 'no_breach' } (recover when condition no longer holds)
 * - state_transition: { pending_count: 0, recovering_count: 0 } (instant breach/recovery)
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
  }, [
    ruleType,
    indexPatterns,
    groupByFields,
    thresholdValue,
    cardinalityField,
    cardinalityValue,
  ]);

  const securityDefaults = useMemo<Partial<FormValues>>(() => {
    const base: Partial<FormValues> = {
      ...SECURITY_OVERRIDES,
      ...initialValues,
    };

    if (ruleType === 'threshold' && generatedQuery) {
      base.evaluation = { query: { base: generatedQuery } };
    }

    return base;
  }, [ruleType, generatedQuery, initialValues]);

  const defaultFromClause = `FROM ${DEFAULT_INDEX_PATTERN.join(', ')}`;

  const effectiveQuery = useMemo(() => {
    if (ruleType === 'threshold') {
      return generatedQuery || defaultFromClause;
    }
    return initialQuery ?? initialValues?.evaluation?.query?.base ?? defaultFromClause;
  }, [ruleType, generatedQuery, initialQuery, initialValues, defaultFromClause]);

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
        tags: [...existingTags.filter((t) => t !== 'security' && t !== 'threshold' && t !== 'esql'), 'security', securityTag],
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

  const prepend = useMemo(
    () => (
      <>
        <RuleTypeSwitcher ruleType={ruleType} onChange={setRuleType} isUpdateView={Boolean(ruleId)} />
        {ruleType === 'threshold' && (
          <>
            <EuiSpacer size="m" />
            <ThresholdFields
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
          </>
        )}
      </>
    ),
    [
      ruleType,
      ruleId,
      indexPatterns,
      groupByFields,
      thresholdValue,
      cardinalityField,
      cardinalityValue,
      generatedQuery,
      services.data.search.search,
    ]
  );

  return (
    <StandaloneRuleForm
      key={`${ruleType}-${generatedQuery}`}
      query={effectiveQuery}
      services={services}
      layout="page"
      includeQueryEditor={ruleType !== 'threshold'}
      includeYaml={false}
      includeKindField={false}
      includeAlertConditions={false}
      prependContent={prepend}
      groupFieldLabel={i18n.SUPPRESSION_FIELDS_LABEL}
      includeSubmission
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit}
      onCancel={onCancel}
      initialValues={securityDefaults}
      ruleId={ruleId}
    />
  );
};
