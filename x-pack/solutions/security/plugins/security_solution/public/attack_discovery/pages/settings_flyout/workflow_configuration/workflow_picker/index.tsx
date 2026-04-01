/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiButtonIcon,
  EuiComboBox,
  EuiSuperSelect,
  type EuiSuperSelectOption,
} from '@elastic/eui';

import { getDisplayName } from './helpers/get_display_name';
import { sortEnabledFirst } from './helpers/sort_enabled_first';
import {
  getWorkflowOptionValue,
  renderSuperSelectDropdownDisplay,
  renderSuperSelectInputDisplay,
  renderWorkflowOption,
} from './helpers/workflow_option_renderers';
import type { WorkflowOption } from './helpers/workflow_option_renderers';
import type { WorkflowPickerProps } from '../types';
import * as i18n from '../translations';

const OPTION_ROW_HEIGHT = 50;

const WorkflowPickerComponent: React.FC<WorkflowPickerProps> = ({
  'data-test-subj': dataTestSubj = 'workflowPicker',
  helpText,
  isInvalid = false,
  isLoading = false,
  label,
  onChange,
  placeholder = i18n.WORKFLOW_PICKER_EMPTY_MESSAGE,
  required = false,
  selectedWorkflowIds,
  singleSelection = false,
  workflows,
}) => {
  const workflowsById = useMemo(() => {
    return new Map(workflows.map((workflow) => [workflow.id, workflow]));
  }, [workflows]);

  const superSelectOptions: Array<EuiSuperSelectOption<string>> = useMemo(() => {
    return sortEnabledFirst(workflows).map((workflow) => ({
      disabled: workflow.enabled === false,
      dropdownDisplay: renderSuperSelectDropdownDisplay(workflow),
      inputDisplay: renderSuperSelectInputDisplay(workflow),
      value: workflow.id,
    }));
  }, [workflows]);

  const valueOfSelected = useMemo(() => {
    const selectedId = selectedWorkflowIds[0];
    if (!selectedId) {
      return undefined;
    }

    return workflowsById.has(selectedId) ? selectedId : undefined;
  }, [selectedWorkflowIds, workflowsById]);

  const handleSuperSelectChange = useCallback(
    (value: string) => {
      onChange(value ? [value] : []);
    },
    [onChange]
  );

  const handleClearSelection = useCallback(() => {
    onChange([]);
  }, [onChange]);

  const handleSelectionChange = useCallback(
    (newSelectedOptions: WorkflowOption[]) => {
      const selectedIds = newSelectedOptions.flatMap((option) =>
        option.value !== undefined ? [option.value.id] : []
      );
      onChange(selectedIds);
    },
    [onChange]
  );

  if (singleSelection) {
    const isClearable = !required && valueOfSelected != null;

    return (
      <EuiSuperSelect
        aria-label={i18n.WORKFLOW_PICKER_ARIA_LABEL}
        append={
          isClearable ? (
            <EuiButtonIcon
              aria-label="Clear selection"
              data-test-subj={`${dataTestSubj}ClearSelection`}
              iconType="cross"
              onClick={handleClearSelection}
              size="s"
            />
          ) : undefined
        }
        data-test-subj={dataTestSubj}
        fullWidth
        isInvalid={isInvalid}
        isLoading={isLoading}
        onChange={handleSuperSelectChange}
        options={superSelectOptions}
        placeholder={placeholder}
        valueOfSelected={valueOfSelected}
      />
    );
  }

  const options: WorkflowOption[] = sortEnabledFirst(workflows).map((workflow) => ({
    disabled: workflow.enabled === false,
    label: getDisplayName(workflow),
    value: getWorkflowOptionValue(workflow),
  }));

  const selectedOptions: WorkflowOption[] = selectedWorkflowIds.map((id) => {
    const workflow = workflowsById.get(id);
    if (!workflow) {
      return { label: id };
    }

    return {
      label: getDisplayName(workflow),
      value: getWorkflowOptionValue(workflow),
    };
  });

  return (
    <EuiComboBox
      aria-label={i18n.WORKFLOW_PICKER_ARIA_LABEL}
      data-test-subj={dataTestSubj}
      fullWidth
      isInvalid={isInvalid}
      isLoading={isLoading}
      noSuggestions={workflows.length === 0 && !isLoading}
      onChange={handleSelectionChange}
      options={options}
      placeholder={placeholder}
      renderOption={renderWorkflowOption}
      rowHeight={OPTION_ROW_HEIGHT}
      selectedOptions={selectedOptions}
      singleSelection={false}
    />
  );
};

WorkflowPickerComponent.displayName = 'WorkflowPicker';

export const WorkflowPicker = React.memo(WorkflowPickerComponent);
