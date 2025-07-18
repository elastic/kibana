/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonLoading,
  EuiSkeletonText,
  EuiSkeletonTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

import { DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS } from '@kbn/elastic-assistant';
import { DEFAULT_END, DEFAULT_START } from '@kbn/elastic-assistant-common';
import * as i18n from './translations';
import type { AttackDiscoveryScheduleSchema } from './types';

import type { FormState } from './edit_form';
import { EditForm } from './edit_form';
import { getDefaultQuery } from '../../../helpers';

const defaultInitialValue: AttackDiscoveryScheduleSchema = {
  name: '',
  alertsSelectionSettings: {
    query: getDefaultQuery(),
    filters: [],
    size: DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS,
    start: DEFAULT_START,
    end: DEFAULT_END,
  },
  interval: '24h',
  actions: [],
};

export interface UseEditForm {
  editForm: React.ReactNode;
  actionButtons: React.ReactNode;
}

export interface UseEditFormProps {
  isLoading: boolean;
  initialValue?: AttackDiscoveryScheduleSchema;
  onFormMutated?: () => void;
  onSave?: (scheduleData: AttackDiscoveryScheduleSchema) => void;
  saveButtonTitle?: string;
}

export const useEditForm = (props: UseEditFormProps): UseEditForm => {
  const {
    initialValue = defaultInitialValue,
    isLoading,
    onFormMutated,
    onSave,
    saveButtonTitle,
  } = props;
  const { euiTheme } = useEuiTheme();

  const [formState, setFormState] = useState<FormState>({
    isValid: undefined,
    submit: async () => ({ isValid: false, data: defaultInitialValue }),
    value: initialValue,
  });

  const onCreate = useCallback(async () => {
    const { isValid, data } = await formState.submit();
    if (!isValid) {
      return;
    }
    onSave?.(data);
  }, [formState, onSave]);

  const editForm = useMemo(() => {
    if (isLoading) {
      return (
        <EuiSkeletonLoading
          isLoading={isLoading}
          loadingContent={
            <>
              <EuiSkeletonTitle />
              <EuiSkeletonText />
            </>
          }
          loadedContent={null}
        />
      );
    }
    return (
      <EditForm initialValue={initialValue} onChange={setFormState} onFormMutated={onFormMutated} />
    );
  }, [initialValue, isLoading, onFormMutated]);

  const actionButtons = useMemo(() => {
    return (
      <EuiFlexGroup alignItems="center" gutterSize="none">
        <EuiFlexItem
          css={css`
            margin-right: ${euiTheme.size.s};
          `}
          grow={false}
        >
          <EuiFlexItem grow={false}>
            <EuiButton data-test-subj="save" size="m" onClick={onCreate} disabled={isLoading}>
              {saveButtonTitle ?? i18n.SCHEDULE_SAVE_BUTTON_TITLE}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }, [euiTheme.size.s, isLoading, onCreate, saveButtonTitle]);

  return { editForm, actionButtons };
};
