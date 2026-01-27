/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  type EuiBasicTableColumn,
  EuiButton,
  EuiButtonIcon,
  EuiCallOut,
  EuiColorPicker,
  EuiColorPickerSwatch,
  EuiFieldNumber,
  EuiFieldText,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import React, { useCallback, useMemo, useRef } from 'react';
import { i18n } from '@kbn/i18n';

export interface LegendStep {
  color: string;
  label: string;
  value: number;
}

interface LegendStepsProps {
  steps: LegendStep[];
  onChange: (steps: LegendStep[]) => void;
}

interface ColorCellProps {
  color: string;
  onChange: (color: string) => void;
}

function ColorCell({ color, onChange }: ColorCellProps) {
  return (
    <EuiColorPicker
      onChange={onChange}
      color={color}
      compressed
      button={
        <EuiColorPickerSwatch
          color={color}
          aria-label={i18n.translate('xpack.infra.legendSteps.selectColorAriaLabel', {
            defaultMessage: 'Select color',
          })}
        />
      }
    />
  );
}

const MAX_STEPS = 18;
const MIN_STEPS = 2;
const MAX_CONTAINER_HEIGHT = 500;

export function hasLegendStepsDuplicates(steps: LegendStep[]): boolean {
  const values = steps.map((s) => s.value);
  const labels = steps.map((s) => s.label.trim()).filter((l) => l !== '');

  const hasDuplicateValues = new Set(values).size !== values.length;
  const hasDuplicateLabels = new Set(labels).size !== labels.length;

  return hasDuplicateValues || hasDuplicateLabels;
}

export function LegendSteps({ steps, onChange }: LegendStepsProps) {
  const { euiTheme } = useEuiTheme();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const hasDuplicates = hasLegendStepsDuplicates(steps);
  const hasEmptyLabels = !steps.every((step) => step.label?.trim());

  const errors: string[] = [];
  if (hasDuplicates) {
    errors.push(
      i18n.translate('xpack.infra.legendSteps.duplicateStepsError', {
        defaultMessage: 'Steps cannot have duplicate values or labels',
      })
    );
  }
  if (hasEmptyLabels) {
    errors.push(
      i18n.translate('xpack.infra.legendSteps.emptyLabelsError', {
        defaultMessage: 'All steps must have a label',
      })
    );
  }

  const isDuplicateValue = useCallback(
    (item: LegendStep, value: number) => {
      return steps.some((s) => s !== item && s.value === value);
    },
    [steps]
  );

  const isDuplicateLabel = useCallback(
    (item: LegendStep, label: string) => {
      // Only check non-empty labels
      if (!label.trim()) return false;
      return steps.some((s) => s !== item && s.label.trim() === label.trim());
    },
    [steps]
  );

  const updateStep = useCallback(
    (step: LegendStep, updates: Partial<LegendStep>) => {
      const index = steps.findIndex((s) => s === step);
      if (index === -1) return;
      const updatedSteps = [...steps];
      updatedSteps[index] = { ...updatedSteps[index], ...updates };
      onChange(updatedSteps);
    },
    [steps, onChange]
  );

  const handleDeleteStep = useCallback(
    (step: LegendStep) => {
      const updatedSteps = steps.filter((s) => s !== step);
      onChange(updatedSteps);
    },
    [steps, onChange]
  );

  const handleAddStep = useCallback(() => {
    const newStep: LegendStep = {
      color: euiTheme.colors.textSubdued,
      label: '',
      value: 0,
    };
    onChange([...steps, newStep]);

    // Scroll to bottom after adding a step
    requestAnimationFrame(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    });
  }, [steps, onChange, euiTheme.colors.textSubdued]);

  const columns: Array<EuiBasicTableColumn<LegendStep>> = useMemo(
    () => [
      {
        field: 'color',
        name: i18n.translate('xpack.infra.legendSteps.colorColumnLabel', {
          defaultMessage: 'Color',
        }),
        width: '60px',
        render: (color: string, item: LegendStep) => (
          <ColorCell color={color} onChange={(newColor) => updateStep(item, { color: newColor })} />
        ),
      },
      {
        field: 'label',
        name: i18n.translate('xpack.infra.legendSteps.labelColumnLabel', {
          defaultMessage: 'Label',
        }),
        render: (label: string, item: LegendStep) => (
          <EuiFieldText
            compressed
            fullWidth={false}
            value={label}
            isInvalid={isDuplicateLabel(item, label)}
            placeholder={i18n.translate('xpack.infra.legendSteps.labelPlaceholder', {
              defaultMessage: 'Label',
            })}
            onChange={(e) => updateStep(item, { label: e.target.value })}
            aria-label={i18n.translate('xpack.infra.legendSteps.labelInputAriaLabel', {
              defaultMessage: 'Step label',
            })}
            data-test-subj={`infraLegendStepsLabelInput-${item.value}`}
          />
        ),
      },
      {
        field: 'value',
        name: i18n.translate('xpack.infra.legendSteps.valueColumnLabel', {
          defaultMessage: 'Value',
        }),
        width: '80px',
        render: (value: number, item: LegendStep) => (
          <EuiFieldNumber
            compressed
            fullWidth={false}
            step={0.01}
            value={value}
            isInvalid={isDuplicateValue(item, value)}
            onChange={(e) => {
              const parsed = parseFloat(e.target.value);
              updateStep(item, { value: isNaN(parsed) ? 0 : parsed });
            }}
            aria-label={i18n.translate('xpack.infra.legendSteps.valueInputAriaLabel', {
              defaultMessage: 'Step value',
            })}
            data-test-subj={`infraLegendStepsValueInput-${item.value}`}
          />
        ),
      },
      {
        field: 'actions',
        name: '',
        width: '40px',
        render: (_value: unknown, item: LegendStep) => (
          <EuiButtonIcon
            aria-label={i18n.translate('xpack.infra.legendSteps.deleteButtonAriaLabel', {
              defaultMessage: 'Delete step',
            })}
            color="danger"
            iconType="trash"
            size="xs"
            onClick={() => handleDeleteStep(item)}
            disabled={steps.length <= MIN_STEPS}
            data-test-subj="infraLegendStepsDeleteStepButton"
          />
        ),
      },
    ],
    [updateStep, handleDeleteStep, steps.length, isDuplicateLabel, isDuplicateValue]
  );

  return (
    <>
      {errors.length > 0 && (
        <>
          <EuiCallOut
            color="danger"
            iconType="alert"
            announceOnMount
            title={i18n.translate('xpack.infra.legendSteps.validationErrorTitle', {
              defaultMessage: 'Please fix the following errors:',
            })}
          >
            <ul>
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </EuiCallOut>
          <EuiSpacer size="s" />
        </>
      )}
      <div
        ref={scrollContainerRef}
        style={{
          maxHeight: MAX_CONTAINER_HEIGHT,
          overflowY: 'auto',
        }}
      >
        <EuiBasicTable
          columns={columns}
          items={steps}
          tableLayout="auto"
          responsiveBreakpoint={false}
          tableCaption={i18n.translate('xpack.infra.legendSteps.tableCaption', {
            defaultMessage: 'Legend steps configuration',
          })}
          rowProps={(item) => ({
            'data-test-subj': `legendStepRow-${item.value}`,
          })}
        />
      </div>
      <EuiSpacer size="s" />
      <EuiButton
        color="text"
        size="s"
        onClick={handleAddStep}
        iconType="plus"
        data-test-subj="infraLegendStepsAddStepButton"
        disabled={steps.length >= MAX_STEPS}
      >
        {i18n.translate('xpack.infra.legendSteps.addStepButtonLabel', {
          defaultMessage: 'Add step',
        })}
      </EuiButton>
    </>
  );
}
