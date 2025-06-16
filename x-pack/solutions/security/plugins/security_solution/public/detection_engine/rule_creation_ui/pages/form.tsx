/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import type { DataViewBase } from '@kbn/es-query';
import { useFormWithWarnings } from '../../../common/hooks/use_form_with_warnings';
import type {
  AboutStepRule,
  ActionsStepRule,
  DefineStepRule,
  ScheduleStepRule,
} from '../../common/types';
import { DataSourceType } from '../../common/types';
import { useKibana } from '../../../common/lib/kibana';
import type { FormHook } from '../../../shared_imports';
import { useFormData } from '../../../shared_imports';
import { schema as defineRuleSchema } from '../components/step_define_rule/schema';
import { schema as aboutRuleSchema } from '../components/step_about_rule/schema';
import { schema as scheduleRuleSchema } from '../components/step_schedule_rule/schema';
import { getSchema as getActionsRuleSchema } from '../../rule_creation/components/step_rule_actions/get_schema';
import { useFetchIndex } from '../../../common/containers/source';
import { VALIDATION_WARNING_CODES } from '../../rule_creation/constants/validation_warning_codes';

export interface UseRuleFormsProps {
  defineStepDefault: DefineStepRule;
  aboutStepDefault: AboutStepRule;
  scheduleStepDefault: ScheduleStepRule;
  actionsStepDefault: ActionsStepRule;
}

export const useRuleForms = ({
  defineStepDefault,
  aboutStepDefault,
  scheduleStepDefault,
  actionsStepDefault,
}: UseRuleFormsProps) => {
  const {
    triggersActionsUi: { actionTypeRegistry },
  } = useKibana().services;
  // DEFINE STEP FORM
  const { form: defineStepForm } = useFormWithWarnings<DefineStepRule>({
    defaultValue: defineStepDefault,
    options: { stripEmptyFields: false, warningValidationCodes: VALIDATION_WARNING_CODES },
    schema: defineRuleSchema,
  });
  const [defineStepFormData] = useFormData<DefineStepRule | {}>({
    form: defineStepForm,
  });
  // FormData doesn't populate on the first render, so we use the defaultValue if the formData
  // doesn't have what we wanted
  const defineStepData = useMemo(
    () => ('index' in defineStepFormData ? defineStepFormData : defineStepDefault),
    [defineStepDefault, defineStepFormData]
  );

  // ABOUT STEP FORM
  const { form: aboutStepForm } = useFormWithWarnings<AboutStepRule>({
    defaultValue: aboutStepDefault,
    options: { stripEmptyFields: false, warningValidationCodes: VALIDATION_WARNING_CODES },
    schema: aboutRuleSchema,
  });
  const [aboutStepFormData] = useFormData<AboutStepRule | {}>({
    form: aboutStepForm,
  });
  const aboutStepData = 'name' in aboutStepFormData ? aboutStepFormData : aboutStepDefault;

  // SCHEDULE STEP FORM
  const { form: scheduleStepForm } = useFormWithWarnings<ScheduleStepRule>({
    defaultValue: scheduleStepDefault,
    options: { stripEmptyFields: false, warningValidationCodes: VALIDATION_WARNING_CODES },
    schema: scheduleRuleSchema,
  });
  const [scheduleStepFormData] = useFormData<ScheduleStepRule | {}>({
    form: scheduleStepForm,
  });
  const scheduleStepData =
    'interval' in scheduleStepFormData ? scheduleStepFormData : scheduleStepDefault;

  // ACTIONS STEP FORM
  const schema = useMemo(() => getActionsRuleSchema({ actionTypeRegistry }), [actionTypeRegistry]);
  const { form: actionsStepForm } = useFormWithWarnings<ActionsStepRule>({
    defaultValue: actionsStepDefault,
    options: { stripEmptyFields: false, warningValidationCodes: VALIDATION_WARNING_CODES },
    schema,
  });
  const [actionsStepFormData] = useFormData<ActionsStepRule | {}>({
    form: actionsStepForm,
  });
  const actionsStepData =
    'actions' in actionsStepFormData ? actionsStepFormData : actionsStepDefault;

  return {
    defineStepForm,
    defineStepData,
    aboutStepForm,
    aboutStepData,
    scheduleStepForm,
    scheduleStepData,
    actionsStepForm,
    actionsStepData,
  };
};

interface UseRuleIndexPatternProps {
  dataSourceType: DataSourceType;
  index: string[];
  dataViewId: string | undefined;
}

export const useRuleIndexPattern = ({
  dataSourceType,
  index,
  dataViewId,
}: UseRuleIndexPatternProps) => {
  const { data } = useKibana().services;
  const [isIndexPatternLoading, { browserFields, indexPatterns: initIndexPattern }] =
    useFetchIndex(index);
  const [indexPattern, setIndexPattern] = useState<DataViewBase>(initIndexPattern);
  // Why do we need this? to ensure the query bar auto-suggest gets the latest updates
  // when the index pattern changes
  // when we select new dataView
  // when we choose some other dataSourceType
  useEffect(() => {
    if (dataSourceType === DataSourceType.IndexPatterns && !isIndexPatternLoading) {
      setIndexPattern(initIndexPattern);
    }

    if (dataSourceType === DataSourceType.DataView) {
      const fetchDataView = async () => {
        if (dataViewId != null && dataViewId !== '') {
          const dv = await data.dataViews.get(dataViewId);
          setIndexPattern(dv);
        }
      };

      fetchDataView();
    }
  }, [dataSourceType, isIndexPatternLoading, data, dataViewId, initIndexPattern]);
  return { indexPattern, isIndexPatternLoading, browserFields };
};

export interface UseRuleFormsErrors {
  defineStepForm?: FormHook<DefineStepRule, DefineStepRule>;
  aboutStepForm?: FormHook<AboutStepRule, AboutStepRule>;
  scheduleStepForm?: FormHook<ScheduleStepRule, ScheduleStepRule>;
  actionsStepForm?: FormHook<ActionsStepRule, ActionsStepRule>;
}
