/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { isEqual } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormControlLayoutDelimited,
  EuiFormFieldset,
  EuiSpacer,
  EuiFormAppend,
  useGeneratedHtmlId,
} from '@elastic/eui';

const StyledFieldset = styled(EuiFormFieldset)`
  &&& {
    legend {
      width: calc(100% - 52px); // right margin + flex item padding
      margin-right: 40px;
    }
    .euiFlexGroup {
      margin-left: 0;
    }
    .euiFlexItem {
      margin-left: 0;
      padding-left: 12px;
    }
  }
`;

const StyledField = styled(EuiFieldText)`
  text-align: left;
`;

const DEFAULT_KEY_LABEL = i18n.translate('xpack.synthetics.keyValuePairsField.key.label', {
  defaultMessage: 'Key',
});

const DEFAULT_VALUE_LABEL = i18n.translate('xpack.synthetics.keyValuePairsField.value.label', {
  defaultMessage: 'Value',
});

export type Pair = [
  string, // key
  string // value
];

export interface KeyValuePairsFieldProps {
  addPairControlLabel: string | React.ReactElement;
  defaultPairs: Pair[];
  onChange: (pairs: Pair[]) => void;
  onBlur?: () => void;
  'data-test-subj'?: string;
  readOnly?: boolean;
  keyLabel?: string | React.ReactElement;
  valueLabel?: string | React.ReactElement;
}

export const KeyValuePairsField = ({
  addPairControlLabel,
  defaultPairs,
  onChange,
  onBlur,
  'data-test-subj': dataTestSubj,
  readOnly,
  keyLabel,
  valueLabel,
}: KeyValuePairsFieldProps) => {
  const [pairs, setPairs] = useState<Pair[]>(defaultPairs);

  const keyLabelId = useGeneratedHtmlId({ prefix: 'keyValuePairsKeyLabel' });
  const valueLabelId = useGeneratedHtmlId({ prefix: 'keyValuePairsValueLabel' });

  useEffect(() => {
    setPairs((prevPairs) => {
      if (isEqual(prevPairs, defaultPairs)) {
        return prevPairs;
      }
      // Parents drop rows that do not have a key yet. Keep those in-progress rows.
      const committedPairs = prevPairs.filter(([key]) => key);
      if (isEqual(committedPairs, defaultPairs)) {
        return prevPairs;
      }
      return defaultPairs;
    });
  }, [defaultPairs]);

  const updatePairs = useCallback(
    (nextPairs: Pair[]) => {
      setPairs(nextPairs);
      onChange(nextPairs);
    },
    [onChange]
  );

  const handleOnChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>, index: number, isKey: boolean) => {
      const targetValue = event.target.value;
      const newPairs = [...pairs];
      const [prevKey, prevValue] = pairs[index];
      newPairs[index] = isKey ? [targetValue, prevValue] : [prevKey, targetValue];
      updatePairs(newPairs);
    },
    [pairs, updatePairs]
  );

  const handleAddPair = useCallback(() => {
    updatePairs([['', ''], ...pairs]);
  }, [pairs, updatePairs]);

  const handleDeletePair = useCallback(
    (index: number) => {
      const newPairs = [...pairs];
      newPairs.splice(index, 1);
      updatePairs(newPairs);
    },
    [pairs, updatePairs]
  );

  return (
    <div data-test-subj={dataTestSubj}>
      <EuiSpacer size="s" />
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton
            iconType="plus"
            onClick={handleAddPair}
            data-test-subj={`${dataTestSubj}__button`}
            isDisabled={readOnly}
          >
            {addPairControlLabel}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <StyledFieldset
        legend={
          !!pairs.length
            ? {
                children: (
                  <EuiFlexGroup responsive={false}>
                    <EuiFlexItem id={keyLabelId}>{keyLabel || DEFAULT_KEY_LABEL}</EuiFlexItem>
                    <EuiFlexItem id={valueLabelId}>{valueLabel || DEFAULT_VALUE_LABEL}</EuiFlexItem>
                  </EuiFlexGroup>
                ),
              }
            : undefined
        }
      >
        {pairs.map((pair, index) => {
          const [key, value] = pair;
          return (
            <Fragment key={index}>
              <EuiSpacer size="xs" />
              <EuiFormControlLayoutDelimited
                fullWidth
                append={
                  <EuiFormAppend
                    iconLeft="trash"
                    isDisabled={readOnly}
                    onClick={() => handleDeletePair(index)}
                    aria-label={i18n.translate(
                      'xpack.synthetics.keyValuePairsField.deleteItem.label',
                      {
                        defaultMessage: 'Delete item number {index}, {key}:{value}',
                        values: { index: index + 1, key, value },
                      }
                    )}
                    data-test-subj="syntheticsKeyValuePairsFieldButton"
                  />
                }
                startControl={
                  <StyledField
                    controlOnly
                    aria-labelledby={keyLabelId}
                    data-test-subj={`keyValuePairsKey${index}`}
                    value={key}
                    onChange={(event) => handleOnChange(event, index, true)}
                    onBlur={() => onBlur?.()}
                    readOnly={readOnly}
                  />
                }
                endControl={
                  <StyledField
                    controlOnly
                    aria-labelledby={valueLabelId}
                    data-test-subj={`keyValuePairsValue${index}`}
                    value={value}
                    onChange={(event) => handleOnChange(event, index, false)}
                    onBlur={() => onBlur?.()}
                    readOnly={readOnly}
                  />
                }
                delimiter=":"
              />
              <EuiSpacer size="xs" />
            </Fragment>
          );
        })}
      </StyledFieldset>
    </div>
  );
};
