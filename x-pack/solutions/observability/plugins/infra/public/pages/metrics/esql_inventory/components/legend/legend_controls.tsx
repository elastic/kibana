/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type { EuiSwitchEvent, EuiRangeProps } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiRange,
  EuiSwitch,
  EuiFieldNumber,
  EuiSpacer,
  EuiButtonGroup,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import {
  type LegendConfig,
  type ColorPaletteName,
  COLOR_PALETTE_NAMES,
  COLOR_PALETTE_LABELS,
} from '../../types';
import { getColorPalette } from '../../utils/color_from_value';

interface LegendControlsProps {
  config: LegendConfig;
  onChange: (config: LegendConfig) => void;
}

/**
 * Preview component for the color palette
 */
const PalettePreview: React.FC<{
  palette: ColorPaletteName;
  steps: number;
  reverse: boolean;
}> = ({ palette, steps, reverse }) => {
  const colors = getColorPalette(palette, steps, reverse);
  return (
    <div
      css={css`
        display: flex;
        height: 16px;
        border-radius: 4px;
        overflow: hidden;
      `}
    >
      {colors.map((color, index) => (
        <div
          key={index}
          css={css`
            flex: 1;
            background-color: ${color};
          `}
        />
      ))}
    </div>
  );
};

export const LegendControls: React.FC<LegendControlsProps> = ({ config, onChange }) => {
  const paletteOptions = COLOR_PALETTE_NAMES.map((name) => ({
    value: name,
    text: COLOR_PALETTE_LABELS[name],
  }));

  const applyColorOptions = [
    {
      id: 'background',
      label: i18n.translate('xpack.infra.esqlInventory.legend.applyTo.background', {
        defaultMessage: 'Background',
      }),
    },
    {
      id: 'text',
      label: i18n.translate('xpack.infra.esqlInventory.legend.applyTo.text', {
        defaultMessage: 'Text',
      }),
    },
  ];

  const handlePaletteChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange({ ...config, palette: e.target.value as ColorPaletteName });
    },
    [config, onChange]
  );

  const handleStepsChange = useCallback<NonNullable<EuiRangeProps['onChange']>>(
    (e, isValid) => {
      const value = parseInt(e.currentTarget.value, 10);
      if (isValid && !isNaN(value) && value >= 2 && value <= 18) {
        onChange({ ...config, steps: value });
      }
    },
    [config, onChange]
  );

  const handleReverseChange = useCallback(
    (e: EuiSwitchEvent) => {
      onChange({ ...config, reverseColors: e.target.checked });
    },
    [config, onChange]
  );

  const handleAutoBoundsChange = useCallback(
    (e: EuiSwitchEvent) => {
      onChange({ ...config, autoBounds: e.target.checked });
    },
    [config, onChange]
  );

  const handleMinChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value);
      if (!isNaN(value)) {
        onChange({ ...config, bounds: { ...config.bounds, min: value } });
      }
    },
    [config, onChange]
  );

  const handleMaxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value);
      if (!isNaN(value)) {
        onChange({ ...config, bounds: { ...config.bounds, max: value } });
      }
    },
    [config, onChange]
  );

  const handleApplyColorToChange = useCallback(
    (id: string) => {
      onChange({ ...config, applyColorTo: id as 'background' | 'text' });
    },
    [config, onChange]
  );

  return (
    <div>
      {/* Palette Selection */}
      <EuiFormRow
        label={i18n.translate('xpack.infra.esqlInventory.legend.palette.label', {
          defaultMessage: 'Color palette',
        })}
        display="columnCompressed"
      >
        <EuiSelect
          options={paletteOptions}
          value={config.palette}
          onChange={handlePaletteChange}
          compressed
          data-test-subj="esqlInventoryLegendPalette"
        />
      </EuiFormRow>

      {/* Palette Preview */}
      <EuiSpacer size="s" />
      <PalettePreview
        palette={config.palette}
        steps={config.steps}
        reverse={config.reverseColors}
      />
      <EuiSpacer size="m" />

      {/* Number of Steps */}
      <EuiFormRow
        label={i18n.translate('xpack.infra.esqlInventory.legend.steps.label', {
          defaultMessage: 'Number of colors',
        })}
        display="columnCompressed"
      >
        <EuiRange
          min={2}
          max={18}
          step={1}
          value={config.steps}
          onChange={handleStepsChange}
          showValue
          compressed
          data-test-subj="esqlInventoryLegendSteps"
        />
      </EuiFormRow>

      {/* Reverse Colors */}
      <EuiSpacer size="s" />
      <EuiSwitch
        label={i18n.translate('xpack.infra.esqlInventory.legend.reverse.label', {
          defaultMessage: 'Reverse colors',
        })}
        checked={config.reverseColors}
        onChange={handleReverseChange}
        compressed
        data-test-subj="esqlInventoryLegendReverse"
      />

      <EuiSpacer size="m" />

      {/* Auto Bounds */}
      <EuiSwitch
        label={i18n.translate('xpack.infra.esqlInventory.legend.autoBounds.label', {
          defaultMessage: 'Auto bounds',
        })}
        checked={config.autoBounds}
        onChange={handleAutoBoundsChange}
        compressed
        data-test-subj="esqlInventoryLegendAutoBounds"
      />

      {/* Manual Bounds */}
      {!config.autoBounds && (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem>
              <EuiFormRow
                label={i18n.translate('xpack.infra.esqlInventory.legend.min.label', {
                  defaultMessage: 'Min',
                })}
                display="columnCompressed"
              >
                <EuiFieldNumber
                  value={config.bounds.min}
                  onChange={handleMinChange}
                  compressed
                  data-test-subj="esqlInventoryLegendMin"
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow
                label={i18n.translate('xpack.infra.esqlInventory.legend.max.label', {
                  defaultMessage: 'Max',
                })}
                display="columnCompressed"
              >
                <EuiFieldNumber
                  value={config.bounds.max}
                  onChange={handleMaxChange}
                  compressed
                  data-test-subj="esqlInventoryLegendMax"
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}

      <EuiSpacer size="m" />

      {/* Apply Color To */}
      <EuiFormRow
        label={i18n.translate('xpack.infra.esqlInventory.legend.applyTo.label', {
          defaultMessage: 'Apply color to',
        })}
        display="columnCompressed"
      >
        <EuiButtonGroup
          legend={i18n.translate('xpack.infra.esqlInventory.legend.applyTo.legend', {
            defaultMessage: 'Apply color to selection',
          })}
          options={applyColorOptions}
          idSelected={config.applyColorTo}
          onChange={handleApplyColorToChange}
          buttonSize="compressed"
          isFullWidth
          data-test-subj="esqlInventoryLegendApplyTo"
        />
      </EuiFormRow>
    </div>
  );
};
