/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryRulesQueryRuleset } from '@elastic/elasticsearch/lib/api/types';
import { useEffect, useState } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { OnDragEndResponder } from '@hello-pangea/dnd';
import { euiDragDropReorder } from '@elastic/eui';
import { QueryRuleEditorForm, SearchQueryRulesQueryRule } from '../../../../common/types';
import { useFetchIndexNames } from '../../../hooks/use_fetch_index_names';
import { isCriteriaAlways } from '../../../utils/query_rules_utils';

export const createEmptyRuleset = (
  rulesetId: QueryRulesQueryRuleset['ruleset_id']
): QueryRulesQueryRuleset => ({
  ruleset_id: rulesetId,
  rules: [],
});

export interface UseQueryRuleFlyoutStateProps {
  createMode: boolean;
  rulesetId: string;
  ruleId: string;
  rules: SearchQueryRulesQueryRule[];
  setIsFormDirty?: (isDirty: boolean) => void;
  onSave: (rule: SearchQueryRulesQueryRule) => void;
}

export const useQueryRuleFlyoutState = ({
  createMode,
  rulesetId,
  ruleId,
  rules,
  setIsFormDirty,
  onSave,
}: UseQueryRuleFlyoutStateProps) => {
  const [isFlyoutDirty, setIsFlyoutDirty] = useState<boolean>(false);
  const { control, getValues, reset, setValue } = useFormContext<QueryRuleEditorForm>();
  const {
    fields: criteria,
    remove,
    replace,
    update,
    append,
  } = useFieldArray({
    control,
    name: 'criteria',
  });
  const {
    fields: actionFields,
    remove: removeAction,
    replace: replaceAction,
    append: appendAction,
  } = useFieldArray({
    control,
    name: 'actions.docs',
  });

  const pinType = useWatch({
    control,
    name: 'type',
  });
  const actionIdsFields = useWatch({
    control,
    name: 'actions.ids',
  });

  const { data: indexNames } = useFetchIndexNames('');

  const ruleFromRuleset = rules.find((rule) => rule.rule_id === ruleId);
  const [isAlways, setIsAlways] = useState<boolean>(
    (ruleFromRuleset?.criteria && isCriteriaAlways(ruleFromRuleset?.criteria)) ?? false
  );
  const isDocRule = Boolean(
    !actionIdsFields || actionFields.length > 0 || !!(actionIdsFields?.length === 0)
  );
  const isIdRule = Boolean(!isDocRule && actionFields.length === 0 && actionIdsFields?.length);

  useEffect(() => {
    if (ruleFromRuleset) {
      reset({
        ...getValues(),
        criteria: ruleFromRuleset.criteria,
        type: ruleFromRuleset.type,
        actions: ruleFromRuleset.actions,
        mode: 'edit',
        ruleId,
      });
      setIsAlways(
        (ruleFromRuleset?.criteria && isCriteriaAlways(ruleFromRuleset?.criteria)) ?? false
      );
    }
  }, [ruleFromRuleset, reset, getValues, rulesetId, ruleId]);

  useEffect(() => {
    if (createMode) {
      reset({
        criteria: [
          {
            type: 'exact',
            metadata: '',
            values: [],
          },
        ],
        type: 'pinned',
        actions: {
          docs: [
            {
              _id: '',
              _index: '',
            },
          ],
          ids: [],
        },
        mode: 'create',
        ruleId,
      });
      setIsAlways(false);
    }
  }, [createMode, reset, ruleId]);

  const handleAddCriteria = () => {
    setIsFlyoutDirty(true);
    append({
      type: 'exact',
      metadata: '',
      values: [],
    });
  };

  const appendNewAction = () => {
    setIsFlyoutDirty(true);
    if (isIdRule) {
      setValue('actions.ids', [...(getValues('actions.ids') || []), '']);
    } else {
      appendAction({
        _id: '',
        _index: '',
      });
    }
  };

  const handleSave = () => {
    setIsFormDirty?.(true);
    const index = rules.findIndex((rule) => rule.rule_id === ruleId);
    if (index !== -1) {
      if (isAlways) {
        replace([
          {
            type: 'always',
          },
        ]);
      }
      let actions = {};
      if (isDocRule) {
        actions = {
          docs: actionFields.map((doc) => ({
            _id: doc._id,
            _index: doc._index,
          })),
        };
      } else if (isIdRule) {
        actions = { ids: actionIdsFields };
      }
      const updatedRule = {
        rule_id: ruleId,
        criteria: isAlways
          ? [{ type: 'always' } as QueryRuleEditorForm['criteria'][0]]
          : criteria.map((c) => {
              const normalizedCriteria = {
                values: c.values,
                metadata: c.metadata,
                type: c.type,
              };
              return normalizedCriteria;
            }),
        type: getValues('type'),
        actions,
      };
      onSave(updatedRule);
    } else {
      onSave({
        rule_id: ruleId,
        criteria: isAlways
          ? [{ type: 'always' }]
          : criteria.map((c) => {
              const normalizedCriteria = {
                values: c.values,
                metadata: c.metadata,
                type: c.type,
              };
              return normalizedCriteria;
            }),
        type: getValues('type'),
        actions: isDocRule
          ? {
              docs: actionFields.map((doc) => ({
                _id: doc._id,
                _index: doc._index,
              })),
            }
          : { ids: actionIdsFields },
      });
    }
  };
  const CRITERIA_CALLOUT_STORAGE_KEY = 'queryRules.criteriaCalloutState';
  const [criteriaCalloutActive, setCriteriaCalloutActive] = useState<boolean>(() => {
    try {
      const savedState = localStorage.getItem(CRITERIA_CALLOUT_STORAGE_KEY);
      if (savedState === null) {
        localStorage.setItem(CRITERIA_CALLOUT_STORAGE_KEY, 'true');
        return true;
      }
      return savedState !== 'false';
    } catch (e) {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CRITERIA_CALLOUT_STORAGE_KEY, criteriaCalloutActive ? 'true' : 'false');
    } catch (e) {
      // If localStorage is not available, we can ignore the error
    }
  }, [criteriaCalloutActive]);

  const shouldShowCriteriaCallout = criteriaCalloutActive && !isAlways;

  const dragEndHandle: OnDragEndResponder<string> = ({ source, destination }) => {
    if (source && destination && (ruleFromRuleset || createMode)) {
      setIsFlyoutDirty(true);
      if (isDocRule) {
        const newActions = euiDragDropReorder(actionFields, source.index, destination.index);
        replaceAction(newActions);
      } else if (isIdRule && actionIdsFields) {
        const newActions = euiDragDropReorder(actionIdsFields, source.index, destination.index);
        setValue('actions.ids', newActions);
      }
    }
  };

  const onDeleteDocument = (index: number) => {
    setIsFlyoutDirty(true);
    if (createMode || !isIdRule) {
      removeAction(index);
    } else {
      if (actionIdsFields) {
        const updatedActions = actionIdsFields.filter((_, i) => i !== index);
        setValue('actions.ids', updatedActions);
      }
    }
  };

  const onIndexSelectorChange = (index: number, indexName: string) => {
    setIsFlyoutDirty(true);
    const updatedActions = actionFields.map((action, i) =>
      i === index ? { ...action, _index: indexName } : action
    );
    replaceAction(updatedActions);
  };

  const onIdSelectorChange = (index: number, id: string) => {
    setIsFlyoutDirty(true);
    if (isIdRule && actionIdsFields) {
      const updatedActions = actionIdsFields.map((value, i) => (i === index ? id : value));
      setValue('actions.ids', updatedActions);
    } else {
      if (isDocRule || createMode) {
        const updatedActions = actionFields.map((action, i) =>
          i === index ? { ...action, _id: id } : action
        );
        replaceAction(updatedActions);
      }
    }
  };

  const documentCount = actionFields.length || actionIdsFields?.length || 0;
  const shouldShowMetadataEditor = (createMode || !!ruleFromRuleset) && !isAlways;
  const criteriaCount = criteria.length;

  return {
    actionFields,
    actionIdsFields,
    appendAction: appendNewAction,
    control,
    criteria,
    criteriaCount,
    documentCount,
    dragEndHandle,
    getValues,
    handleAddCriteria,
    handleSave,
    indexNames,
    isAlways,
    isDocRule,
    isFlyoutDirty,
    isIdRule,
    onDeleteDocument,
    onIdSelectorChange,
    onIndexSelectorChange,
    pinType,
    remove,
    setCriteriaCalloutActive,
    setIsAlways,
    setIsFlyoutDirty,
    shouldShowCriteriaCallout,
    shouldShowMetadataEditor,
    update,
  };
};
