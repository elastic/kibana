/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiCallOut, EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { DEFAULT_INDEX_KEY } from '../../../../../../common/constants';
import { useKibana } from '../../../../../common/lib/kibana';
import { useUpdateIndexPattern } from '../../../logic/use_update_index_pattern';
import { IndexPatternPlaceholderFormWrapper } from './flyout';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import type { FormSchema } from '../../../../../shared_imports';
import { useDataViewListItems } from '../../../../../detection_engine/rule_creation_ui/components/data_view_selector_field/use_data_view_list_items';
import {
  Field,
  FIELD_TYPES,
  fieldValidators,
  getUseField,
  useForm,
  useFormData,
} from '../../../../../shared_imports';

import * as i18n from './translations';

const CommonUseField = getUseField({ component: Field });

interface IndexPatternsFormData {
  index: string[];
  overwrite: boolean;
  overwriteDataViews: boolean;
}

const schema: FormSchema<IndexPatternsFormData> = {
  index: {
    fieldsToValidateOnChange: ['index'],
    type: FIELD_TYPES.COMBO_BOX,
    validations: [
      {
        validator: fieldValidators.emptyField(i18n.UPDATE_INDEX_PATTERN_REQUIRED_ERROR),
      },
    ],
  },
};

const initialFormData: IndexPatternsFormData = {
  index: [],
};

interface UpdateIndexPatternFormProps {
  onClose: () => void;
  onSubmit: () => void;
  migrationId: string;
  selectedRuleIds: string[];
  refetchData: () => void;
}

export const UpdateIndexPatternForm = memo(
  ({
    onClose,
    onSubmit,
    migrationId,
    selectedRuleIds,
    refetchData,
  }: UpdateIndexPatternFormProps) => {
    const { addError } = useAppToasts();
    const { form } = useForm({
      defaultValue: initialFormData,
      schema,
    });
    console.log('selectedRuleIds', selectedRuleIds, migrationId);
    const { mutate: updateIndexPattern } = useUpdateIndexPattern(migrationId, {
      onError: (error) => {
        addError(error, { title: i18n.UPDATE_INDEX_PATTERN_FAILURE });
      },
      onSuccess: () => {
        refetchData?.();
      },
    });
    const { data: dataViews, isFetching: areDataViewsFetching } = useDataViewListItems();

    const [formData] = useFormData({ form, watch: ['index'] });

    const { uiSettings } = useKibana().services;
    const defaultPatterns = uiSettings.get<string[]>(DEFAULT_INDEX_KEY);
    console.log('dataViews', dataViews);

    const dataViewOptions = useMemo(() => {
      return [
        ...dataViews?.map((dataView) => ({ label: dataView.id, value: dataView.title })),
        ...defaultPatterns.map((label) => ({ label })),
      ];
    }, [dataViews, defaultPatterns]);

    return (
      <IndexPatternPlaceholderFormWrapper
        form={form}
        title={i18n.INDEX_PATTERN_PLACEHOLDER_FORM_TITLE}
        onClose={onClose}
        onSubmit={() => {
          updateIndexPattern({
            migrationId,
            indexPattern: formData.index.join(','),
            ids: selectedRuleIds.length > 0 ? selectedRuleIds : undefined,
          });
        }}
      >
        <CommonUseField
          path="index"
          config={{
            ...schema.index,
            label: i18n.INDEX_PATTERN_PLACEHOLDER_FORM_TITLE,
            helpText: i18n.INDEX_PATTERN_PLACEHOLDER_FORM_HELP_TEXT,
          }}
          componentProps={{
            idAria: 'updateIndexPatternIndexPatterns',
            'data-test-subj': 'updateIndexPatternIndexPatterns',
            euiFieldProps: {
              fullWidth: true,
              placeholder: '',
              noSuggestions: false,
              options: dataViewOptions,
            },
          }}
        />
      </IndexPatternPlaceholderFormWrapper>
    );
  }
);

UpdateIndexPatternForm.displayName = 'UpdateIndexPatternForm';
