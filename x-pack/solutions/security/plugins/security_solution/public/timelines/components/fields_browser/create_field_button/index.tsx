/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButton } from '@elastic/eui';
import styled from 'styled-components';

import type { CreateFieldComponent } from '@kbn/response-ops-alerts-fields-browser/types';
import type { OpenFieldEditor } from '..';
import * as i18n from './translations';

const StyledButton = styled(EuiButton)`
  margin-left: ${({ theme }) => theme.eui.euiSizeM};
`;

export interface UseCreateFieldButtonProps {
  isAllowed: boolean;
  loading: boolean;
  openFieldEditor: OpenFieldEditor;
}
export type UseCreateFieldButton = (
  props: UseCreateFieldButtonProps
) => CreateFieldComponent | undefined;
/**
 *
 * Returns a memoised 'CreateFieldButton' with only an 'onClick' property.
 */
export const useCreateFieldButton: UseCreateFieldButton = ({
  isAllowed,
  loading,
  openFieldEditor,
}) => {
  const createFieldButton = useCallback<CreateFieldComponent>(
    ({ onHide }) => (
      <StyledButton
        iconType={loading ? 'none' : 'plusInCircle'}
        aria-label={i18n.CREATE_FIELD}
        data-test-subj="create-field"
        onClick={() => {
          openFieldEditor();
          onHide();
        }}
        isLoading={loading}
      >
        {i18n.CREATE_FIELD}
      </StyledButton>
    ),
    [loading, openFieldEditor]
  );

  return isAllowed ? createFieldButton : undefined;
};
