/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiCallOut, EuiComboBox, EuiFormRow, EuiSpacer } from '@elastic/eui';
import type { FieldHook } from '../../../../shared_imports';
import { getFieldValidityAndErrorMessage } from '../../../../shared_imports';
import { isDataViewIdValid } from '../../validators/data_view_id_validator_factory';
import { useDataViewListItems } from './use_data_view_list_items';
import * as i18n from './translations';

const SECURITY_DEFAULT_DATA_VIEW_ID = 'security-solution-default';

export interface DataViewSelectorProps {
  field: FieldHook<string | undefined>;
}

export function DataViewSelectorField({ field }: DataViewSelectorProps): JSX.Element {
  const { data: dataViews, isFetching: areDataViewsFetching } = useDataViewListItems();
  const fieldAndError = field ? getFieldValidityAndErrorMessage(field) : undefined;
  const isInvalid = fieldAndError?.isInvalid;
  const errorMessage = fieldAndError?.errorMessage;
  const comboBoxOptions = useMemo(
    () =>
      dataViews.map(({ id, title: label }) => ({
        id,
        label,
      })),
    [dataViews]
  );
  const selectedOption = useMemo(
    () => comboBoxOptions.find(({ id }) => id === field.value),
    [comboBoxOptions, field]
  );

  const handleDataViewsChange = useCallback(
    (options: Array<EuiComboBoxOptionOption<string>>) => field.setValue(options[0]?.id),
    [field]
  );

  return (
    <>
      {!areDataViewsFetching && isDataViewIdValid(field.value) && !selectedOption && (
        <>
          <EuiCallOut
            title={i18n.DATA_VIEW_NOT_FOUND_WARNING_LABEL}
            color="warning"
            iconType="help"
            data-test-subj="missingDataViewWarning"
          >
            <p>{i18n.DATA_VIEW_NOT_FOUND_WARNING_DESCRIPTION(field.value)}</p>
          </EuiCallOut>
          <EuiSpacer size="s" />
        </>
      )}
      {field.value === SECURITY_DEFAULT_DATA_VIEW_ID && (
        <>
          <EuiCallOut
            title={i18n.DATA_VIEW_ALERTS_ON_ALERTS_WARNING_LABEL}
            color="warning"
            iconType="help"
            data-test-subj="defaultSecurityDataViewWarning"
          >
            <p>{i18n.DATA_VIEW_ALERTS_ON_ALERTS_WARNING_DESCRIPTION}</p>
          </EuiCallOut>
          <EuiSpacer size="s" />
        </>
      )}
      <EuiFormRow
        label={field.label}
        helpText={field.helpText}
        error={errorMessage}
        isInvalid={isInvalid}
        data-test-subj="pick-rule-data-source"
      >
        <EuiComboBox
          isDisabled={areDataViewsFetching}
          isClearable
          singleSelection={{ asPlainText: true }}
          onChange={handleDataViewsChange}
          options={comboBoxOptions}
          selectedOptions={selectedOption ? [selectedOption] : []}
          aria-label={i18n.PICK_INDEX_PATTERNS}
          placeholder={i18n.PICK_INDEX_PATTERNS}
          data-test-subj="detectionsDataViewSelectorDropdown"
        />
      </EuiFormRow>
    </>
  );
}
