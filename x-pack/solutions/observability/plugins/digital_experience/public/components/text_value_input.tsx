/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton, EuiFieldText, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { DIGITAL_EXPERIENCE_EBT_ACTIONS } from '../ebt_constants';

/**
 * A field to write a value of a filter that has no list to pick from, added with Enter or the
 * button; the text is trimmed, and an empty one is not added.
 */
export function TextValueInput({
  onAdd,
  maxLength,
  placeholder,
  isDisabled = false,
  ebtElement,
  'data-test-subj': dataTestSubj,
}: {
  onAdd: (text: string) => void;
  maxLength: number;
  placeholder: string;
  /** E.g. when the filter has all the values it takes. */
  isDisabled?: boolean;
  /** Names the filter in click telemetry. */
  ebtElement: string;
  'data-test-subj': string;
}) {
  const [text, setText] = useState('');
  const trimmed = text.trim();

  const add = () => {
    if (trimmed === '' || isDisabled) {
      return;
    }
    onAdd(trimmed);
    setText('');
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        add();
      }}
    >
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem>
          <EuiFieldText
            compressed
            fullWidth
            maxLength={maxLength}
            placeholder={placeholder}
            aria-label={placeholder}
            value={text}
            disabled={isDisabled}
            onChange={(event) => setText(event.target.value)}
            data-test-subj={`${dataTestSubj}Input`}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            type="submit"
            isDisabled={isDisabled || trimmed === ''}
            data-test-subj={`${dataTestSubj}Add`}
            {...getEbtProps({
              action: DIGITAL_EXPERIENCE_EBT_ACTIONS.SET_FILTER,
              element: ebtElement,
            })}
          >
            {i18n.translate('xpack.digitalExperience.textValueInput.add', {
              defaultMessage: 'Add',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </form>
  );
}
