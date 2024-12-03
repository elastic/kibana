/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, FocusEvent } from 'react';

import { EuiFieldNumber } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { SIZE_FIELD_MAXIMUM, SIZE_FIELD_MINIMUM } from '../constants';
import { FieldResultSetting } from '../types';

const updateOrClearSizeForField = (
  fieldName: string,
  fieldValue: number,
  updateAction: (fieldName: string, size: number) => void,
  clearAction: (fieldName: string) => void
) => {
  if (typeof fieldValue === 'number' && !isNaN(fieldValue)) {
    updateAction(fieldName, fieldValue);
  } else {
    clearAction(fieldName);
  }
};

const handleFieldNumberChange = (
  fieldName: string,
  updateAction: (fieldName: string, size: number) => void,
  clearAction: (fieldName: string) => void
) => {
  return (e: ChangeEvent<HTMLInputElement>) => {
    const fieldValue = parseInt(e.target.value, 10);
    updateOrClearSizeForField(fieldName, fieldValue, updateAction, clearAction);
  };
};

const handleFieldNumberBlur = (
  fieldName: string,
  updateAction: (fieldName: string, size: number) => void,
  clearAction: (fieldName: string) => void
) => {
  return (e: FocusEvent<HTMLInputElement>) => {
    let fieldValue = parseInt(e.target.value, 10);
    if (!isNaN(fieldValue)) {
      fieldValue = Math.min(SIZE_FIELD_MAXIMUM, Math.max(SIZE_FIELD_MINIMUM, fieldValue));
    }
    updateOrClearSizeForField(fieldName, fieldValue, updateAction, clearAction);
  };
};

interface Props {
  fieldSettings: Partial<FieldResultSetting>;
  fieldName: string;
  fieldEnabledProperty: keyof FieldResultSetting;
  fieldSizeProperty: keyof FieldResultSetting;
  updateAction: (fieldName: string, size: number) => void;
  clearAction: (fieldName: string) => void;
}

export const FieldNumber: React.FC<Props> = ({
  fieldSettings,
  fieldName,
  fieldEnabledProperty,
  fieldSizeProperty,
  updateAction,
  clearAction,
}) => {
  return (
    <EuiFieldNumber
      value={
        typeof fieldSettings[fieldSizeProperty] === 'number'
          ? (fieldSettings[fieldSizeProperty] as number)
          : ' ' // Without the space, invalid non-numbers don't get cleared for some reason
      }
      placeholder={i18n.translate(
        'xpack.enterpriseSearch.appSearch.engine.resultSettings.numberFieldPlaceholder',
        { defaultMessage: 'No limit' }
      )}
      disabled={!fieldSettings[fieldEnabledProperty]}
      min={SIZE_FIELD_MINIMUM}
      max={SIZE_FIELD_MAXIMUM}
      onChange={handleFieldNumberChange(fieldName, updateAction, clearAction)}
      onBlur={handleFieldNumberBlur(fieldName, updateAction, clearAction)}
      size={4}
    />
  );
};
