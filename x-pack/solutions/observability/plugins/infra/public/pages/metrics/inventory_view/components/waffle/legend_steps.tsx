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
  EuiColorPicker,
  EuiColorPickerSwatch,
  EuiFieldNumber,
  EuiFieldText,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
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

export function LegendSteps({ steps, onChange }: LegendStepsProps) {
  const minSteps = 2;
  const maxSteps = 18; // Same values as color palette selector in LegendControls.

  const { euiTheme } = useEuiTheme();

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
    const lastStep = steps[steps.length - 1];
    const newStep: LegendStep = {
      color: euiTheme.colors.textSubdued,
      label: '',
      value: lastStep ? lastStep.value + 1 : 0,
    };
    onChange([...steps, newStep]);
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
            value={value}
            onChange={(e) => updateStep(item, { value: parseFloat(e.target.value) || 0 })}
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
            disabled={steps.length <= minSteps}
            data-test-subj="infraLegendStepsDeleteStepButton"
          />
        ),
      },
    ],
    [updateStep, handleDeleteStep, steps.length]
  );

  return (
    <>
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
      <EuiSpacer size="s" />
      <EuiButton
        color="text"
        size="s"
        onClick={handleAddStep}
        iconType="plus"
        data-test-subj="infraLegendStepsAddStepButton"
        disabled={steps.length >= maxSteps}
      >
        {i18n.translate('xpack.infra.legendSteps.addStepButtonLabel', {
          defaultMessage: 'Add step',
        })}
      </EuiButton>
    </>
  );
}
