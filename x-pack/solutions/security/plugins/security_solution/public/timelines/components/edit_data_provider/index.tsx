/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noop } from 'lodash/fp';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiButton,
  EuiComboBox,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import styled from 'styled-components';

import type { BrowserFields } from '../../../common/containers/source';
import type { PrimitiveOrArrayOfPrimitives } from '../../../common/lib/kuery';
import type { OnDataProviderEdited } from '../timeline/events';
import type { QueryOperator } from '../timeline/data_providers/data_provider';
import { type DataProviderType, DataProviderTypeEnum } from '../../../../common/api/timeline';

import {
  getCategorizedFieldNames,
  getExcludedFromSelection,
  getQueryOperatorFromSelection,
  operatorLabels,
  selectionsAreValid,
} from './helpers';

import { ControlledComboboxInput, ControlledDefaultInput } from './components';

import * as i18n from './translations';

const EDIT_DATA_PROVIDER_WIDTH = 400;
const OPERATOR_COMBO_BOX_WIDTH = 152;
const SAVE_CLASS_NAME = 'edit-data-provider-save';
const VALUE_INPUT_CLASS_NAME = 'edit-data-provider-value';

export const HeaderContainer = styled.div`
  width: ${EDIT_DATA_PROVIDER_WIDTH};
`;

HeaderContainer.displayName = 'HeaderContainer';

interface Props {
  andProviderId?: string;
  browserFields: BrowserFields;
  field: string;
  isExcluded: boolean;
  onDataProviderEdited: OnDataProviderEdited;
  operator: QueryOperator;
  providerId: string;
  timelineId: string;
  value: PrimitiveOrArrayOfPrimitives;
  type?: DataProviderType;
}

export const getInitialOperatorLabel = (
  isExcluded: boolean,
  operator: QueryOperator
): EuiComboBoxOptionOption[] => {
  if (operator === ':') {
    return isExcluded ? [{ label: i18n.IS_NOT }] : [{ label: i18n.IS }];
  } else if (operator === 'includes') {
    return isExcluded ? [{ label: i18n.IS_NOT_ONE_OF }] : [{ label: i18n.IS_ONE_OF }];
  } else {
    return isExcluded ? [{ label: i18n.DOES_NOT_EXIST }] : [{ label: i18n.EXISTS }];
  }
};

export const StatefulEditDataProvider = React.memo<Props>(
  ({
    andProviderId,
    browserFields,
    field,
    isExcluded,
    onDataProviderEdited,
    operator,
    providerId,
    timelineId,
    value,
    type = DataProviderTypeEnum.default,
  }) => {
    const [updatedField, setUpdatedField] = useState<EuiComboBoxOptionOption[]>([{ label: field }]);
    const [updatedOperator, setUpdatedOperator] = useState<EuiComboBoxOptionOption[]>(
      getInitialOperatorLabel(isExcluded, operator)
    );

    const [updatedValue, setUpdatedValue] = useState<PrimitiveOrArrayOfPrimitives>(value);

    const showComboBoxInput = useMemo(
      () =>
        updatedOperator.length > 0 &&
        (updatedOperator[0].label === i18n.IS_ONE_OF ||
          updatedOperator[0].label === i18n.IS_NOT_ONE_OF),
      [updatedOperator]
    );

    const showValueInput = useMemo(
      () =>
        type !== DataProviderTypeEnum.template &&
        updatedOperator.length > 0 &&
        updatedOperator[0].label !== i18n.EXISTS &&
        updatedOperator[0].label !== i18n.DOES_NOT_EXIST &&
        !showComboBoxInput,
      [showComboBoxInput, type, updatedOperator]
    );

    const disableSave = useMemo(
      () => showComboBoxInput && Array.isArray(updatedValue) && !updatedValue.length,
      [showComboBoxInput, updatedValue]
    );

    /** Focuses the Value input if it is visible, falling back to the Save button if it's not */
    const focusInput = () => {
      const elements = document.getElementsByClassName(VALUE_INPUT_CLASS_NAME);

      if (elements.length > 0) {
        (elements[0] as HTMLElement).focus(); // this cast is required because focus() does not exist on every `Element` returned by `getElementsByClassName`
      } else {
        const saveElements = document.getElementsByClassName(SAVE_CLASS_NAME);

        if (saveElements.length > 0) {
          (saveElements[0] as HTMLElement).focus();
        }
      }
    };

    const onFieldSelected = useCallback(
      (selectedField: EuiComboBoxOptionOption[]) => {
        setUpdatedField(selectedField);

        if (type === DataProviderTypeEnum.template) {
          setUpdatedValue(`{${selectedField[0].label}}`);
        }

        focusInput();
      },
      [type]
    );

    const onOperatorSelected = useCallback((operatorSelected: EuiComboBoxOptionOption[]) => {
      setUpdatedOperator(operatorSelected);

      focusInput();
    }, []);

    const onValueChange = useCallback((changedValue: string | number | string[]) => {
      setUpdatedValue(changedValue);
    }, []);

    const disableScrolling = () => {
      const x =
        window.pageXOffset !== undefined
          ? window.pageXOffset
          : (document.documentElement || document.body.parentNode || document.body).scrollLeft;

      const y =
        window.pageYOffset !== undefined
          ? window.pageYOffset
          : (document.documentElement || document.body.parentNode || document.body).scrollTop;

      window.onscroll = () => window.scrollTo(x, y);
    };

    const enableScrolling = () => {
      window.onscroll = () => noop;
    };

    const handleSave = useCallback(() => {
      onDataProviderEdited({
        andProviderId,
        excluded: getExcludedFromSelection(updatedOperator),
        field: updatedField.length > 0 ? updatedField[0].label : '',
        id: timelineId,
        operator: getQueryOperatorFromSelection(updatedOperator),
        providerId,
        value: updatedValue,
        type,
      });
    }, [
      onDataProviderEdited,
      andProviderId,
      updatedOperator,
      updatedField,
      timelineId,
      providerId,
      updatedValue,
      type,
    ]);

    useEffect(() => {
      disableScrolling();
      return () => {
        enableScrolling();
      };
    }, []);

    return (
      <EuiPanel paddingSize="s">
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem grow={true}>
            <EuiFormRow label={i18n.FIELD}>
              <EuiComboBox
                autoFocus
                data-test-subj="field"
                isClearable={false}
                onChange={onFieldSelected}
                options={getCategorizedFieldNames(browserFields)}
                placeholder={i18n.FIELD_PLACEHOLDER}
                selectedOptions={updatedField}
                singleSelection={{ asPlainText: true }}
                fullWidth={true}
              />
            </EuiFormRow>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiSpacer size="m" />
          </EuiFlexItem>

          <EuiFlexItem grow={true}>
            <EuiFlexGroup gutterSize="s" direction="row" justifyContent="spaceBetween">
              <EuiFlexItem grow={true}>
                <EuiFormRow label={i18n.OPERATOR}>
                  <EuiComboBox
                    data-test-subj="operator"
                    isClearable={false}
                    onChange={onOperatorSelected}
                    options={operatorLabels}
                    placeholder={i18n.SELECT_AN_OPERATOR}
                    selectedOptions={updatedOperator}
                    singleSelection={{ asPlainText: true }}
                    style={{ minWidth: OPERATOR_COMBO_BOX_WIDTH }}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiSpacer size="m" />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            {showValueInput && (
              <EuiFormRow label={i18n.VALUE_LABEL}>
                <ControlledDefaultInput onChangeCallback={onValueChange} value={value} />
              </EuiFormRow>
            )}

            {showComboBoxInput && type !== DataProviderTypeEnum.template && (
              <EuiFormRow label={i18n.VALUE_LABEL}>
                <ControlledComboboxInput onChangeCallback={onValueChange} value={value} />
              </EuiFormRow>
            )}
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiSpacer size="m" />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            {type === DataProviderTypeEnum.template && showComboBoxInput && (
              <>
                <EuiCallOut
                  color="warning"
                  iconType="warning"
                  size="s"
                  title={i18n.UNAVAILABLE_OPERATOR(updatedOperator[0].label)}
                />
                <EuiSpacer size="m" />
              </>
            )}
            <EuiFlexGroup justifyContent="flexEnd" gutterSize="none">
              <EuiFlexItem grow={false}>
                <EuiButton
                  className={SAVE_CLASS_NAME}
                  color="primary"
                  data-test-subj="save"
                  fill={true}
                  isDisabled={
                    !selectionsAreValid({
                      type,
                      browserFields,
                      selectedField: updatedField,
                      selectedOperator: updatedOperator,
                    }) || disableSave
                  }
                  onClick={handleSave}
                  size="m"
                >
                  {i18n.SAVE}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
);

StatefulEditDataProvider.displayName = 'StatefulEditDataProvider';
