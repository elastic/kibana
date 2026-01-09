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
  EuiFieldText,
  EuiFormRow,
  EuiSpacer,
  useColorPickerState,
} from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';

interface ColorPickerProps {
  initialColor: string;
}

function ColorPicker({ initialColor }: ColorPickerProps) {
  const [color, setColor, errors] = useColorPickerState(initialColor);
  const [selectedColor, setSelectedColor] = useState(color);
  const handleColorChange: EuiColorPicker['onChange'] = (text, { hex, isValid }) => {
    setColor(text, { hex, isValid });
    setSelectedColor(hex);
  };
  return (
    <>
      <EuiFormRow error={errors}>
        <EuiColorPicker
          onChange={handleColorChange}
          color={color}
          secondaryInputDisplay="top"
          button={<EuiColorPickerSwatch color={selectedColor} aria-label="Select a new color" />}
          isClearable={true}
        />
      </EuiFormRow>
      <EuiSpacer />
      <EuiColorPicker
        onChange={handleColorChange}
        color={color}
        isInvalid={!!errors}
        button={<></>}
      />
    </>
  );
}

export function LegendSteps({ steps }) {
  function handleAddStep() {}

  const columns: EuiBasicTableColumn<{}> = [
    {
      field: 'color',
      name: 'Color',
      render: (color) => <ColorPicker initialColor={color} />,
    },
    {
      field: 'label',
      name: 'Label',
      render: (label) => {
        return <EuiFieldText compressed={true} fullWidth={false} value={label} />;
      },
    },
    {
      field: 'value',
      name: 'Value',
      render: (value) => {
        return <EuiFieldText compressed={true} fullWidth={false} value={value} />;
      },
      width: '50px',
    },
    {
      field: 'delete',
      name: '',
      render: () => {
        return (
          <EuiButtonIcon
            aria-label={i18n.translate('xpack.infra.infra.legendSteps.deleteButtonAriaLabel', {
              defaultMessage: 'delete',
            })}
            color="danger"
            data-test-subj="infraLegendStepsDeleteStepButton"
            disabled={false}
            size="xs"
            iconType="trash"
          />
        );
      },
    },
  ];
  return (
    <>
      <EuiBasicTable
        columns={columns}
        items={steps}
        tableLayout="auto"
        responsiveBreakpoint={false}
      />
      <EuiSpacer size="s" />
      <EuiFormRow fullWidth={true} display="columnCompressed">
        <EuiButton color="text" size="s" onClick={handleAddStep} iconType="plus">
          Add step
        </EuiButton>
      </EuiFormRow>
    </>
  );
}
