/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSwitchEvent } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiButton,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiFieldNumber,
  EuiForm,
  EuiFormRow,
  EuiPopover,
  EuiPopoverTitle,
  EuiSpacer,
  EuiSwitch,
  EuiSelect,
  EuiRange,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import styled from '@emotion/styled';
import type { SyntheticEvent } from 'react';
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { first, last, isEqual } from 'lodash';
import type { EuiRangeProps, EuiSelectProps } from '@elastic/eui';
import type { WaffleLegendOptions } from '../../hooks/use_waffle_options';
import {
  type InfraWaffleMapBounds,
  type InventoryColorPalette,
  PALETTES,
} from '../../../../../common/inventory/types';
import { getColorPalette } from '../../lib/get_color_palette';
import { convertBoundsToPercents } from '../../lib/convert_bounds_to_percents';
import { ColorLabel } from './color_label';
import { LegendSteps, type LegendStep } from './legend_steps';
import { PalettePreview } from './palette_preview';

interface Props {
  onChange: (options: {
    auto: boolean;
    bounds: InfraWaffleMapBounds;
    legend: WaffleLegendOptions;
  }) => void;
  bounds: InfraWaffleMapBounds;
  dataBounds: InfraWaffleMapBounds;
  autoBounds: boolean;
  boundsOverride: InfraWaffleMapBounds;
  options: WaffleLegendOptions;
}

const PALETTE_NAMES: InventoryColorPalette[] = [
  'temperature',
  'status',
  'cool',
  'warm',
  'positive',
  'negative',
];

const PALETTE_OPTIONS = PALETTE_NAMES.map((name) => ({ text: PALETTES[name], value: name }));

interface DraftState {
  auto: boolean;
  bounds: { min: number; max: number };
  legend: WaffleLegendOptions;
  type: 'gradient' | 'steps';
}

const createDraftState = (
  autoBounds: boolean,
  boundsOverride: InfraWaffleMapBounds,
  options: WaffleLegendOptions
): DraftState => ({
  auto: autoBounds,
  bounds: convertBoundsToPercents(boundsOverride),
  legend: options,
  type: options.type || 'gradient',
});

export const LegendControls = ({
  autoBounds,
  boundsOverride,
  onChange,
  dataBounds,
  options,
}: Props) => {
  const [isPopoverOpen, setPopoverState] = useState(false);
  const [draft, setDraft] = useState<DraftState>(() =>
    createDraftState(autoBounds, boundsOverride, options)
  );

  const { euiTheme } = useEuiTheme();
  const defaultLegendSteps = useMemo<LegendStep[]>(
    () => [
      { color: euiTheme.colors.severity.success, label: 'OK', value: 0 },
      { color: euiTheme.colors.severity.warning, label: 'WARNING', value: 1 },
      { color: euiTheme.colors.severity.danger, label: 'CRITICAL', value: 2 },
      { color: euiTheme.colors.severity.unknown, label: 'UNKNOWN', value: 3 },
    ],
    [euiTheme.colors.severity]
  );

  useEffect(() => {
    if (draft.auto) {
      setDraft((prev) => ({ ...prev, bounds: convertBoundsToPercents(dataBounds) }));
    }
  }, [dataBounds, draft.auto]);

  // Sync draft state from current values when opening popover
  const handleOpenPopover = useCallback(() => {
    setDraft(createDraftState(autoBounds, boundsOverride, options));
    setPopoverState(true);
  }, [autoBounds, boundsOverride, options]);

  const buttonComponent = (
    <EuiButtonIcon
      iconType="color"
      color="text"
      display="base"
      size="s"
      aria-label={i18n.translate('xpack.infra.legendControls.buttonLabel', {
        defaultMessage: 'configure legend',
      })}
      onClick={handleOpenPopover}
      data-test-subj="openLegendControlsButton"
    />
  );

  const handleAutoChange = useCallback(
    (e: EuiSwitchEvent) => {
      const auto = e.target.checked;
      setDraft((prev) => ({
        ...prev,
        auto,
        bounds: auto ? prev.bounds : convertBoundsToPercents(boundsOverride),
      }));
    },
    [boundsOverride]
  );

  const handleReverseColors = useCallback((e: EuiSwitchEvent) => {
    setDraft((prev) => ({
      ...prev,
      legend: { ...prev.legend, reverseColors: e.target.checked },
    }));
  }, []);

  const handleMaxBounds = useCallback((e: SyntheticEvent<HTMLInputElement>) => {
    const value = parseFloat(e.currentTarget.value);
    setDraft((prev) => {
      // Auto correct the max to be one larger then the min OR 100
      const max = value <= prev.bounds.min ? prev.bounds.min + 1 : value > 100 ? 100 : value;
      return { ...prev, bounds: { ...prev.bounds, max } };
    });
  }, []);

  const handleMinBounds = useCallback((e: SyntheticEvent<HTMLInputElement>) => {
    const value = parseFloat(e.currentTarget.value);
    setDraft((prev) => {
      // Auto correct the min to be one smaller then the max OR ZERO
      const min = value >= prev.bounds.max ? prev.bounds.max - 1 : value < 0 ? 0 : value;
      return { ...prev, bounds: { ...prev.bounds, min } };
    });
  }, []);

  const handleApplyClick = useCallback(() => {
    onChange({
      auto: draft.auto,
      bounds: { min: draft.bounds.min / 100, max: draft.bounds.max / 100 },
      legend: { ...draft.legend, type: draft.type },
    });
    setPopoverState(false);
  }, [onChange, draft]);

  const handleCancelClick = useCallback(() => {
    setDraft(createDraftState(autoBounds, boundsOverride, options));
    setPopoverState(false);
  }, [autoBounds, boundsOverride, options]);

  const handleStepsChange = useCallback<NonNullable<EuiRangeProps['onChange']>>((e) => {
    const steps = parseInt((e.target as HTMLInputElement).value, 10);
    setDraft((prev) => ({ ...prev, legend: { ...prev.legend, steps } }));
  }, []);

  const handlePaletteChange = useCallback<NonNullable<EuiSelectProps['onChange']>>((e) => {
    const palette = e.target.value as WaffleLegendOptions['palette'];
    setDraft((prev) => ({ ...prev, legend: { ...prev.legend, palette } }));
  }, []);

  const handleRulesChange = useCallback((rules: LegendStep[]) => {
    setDraft((prev) => ({ ...prev, legend: { ...prev.legend, rules } }));
  }, []);

  const originalState = createDraftState(autoBounds, boundsOverride, options);
  const commited = isEqual(draft, originalState);

  const boundsValidRange = draft.bounds.min < draft.bounds.max;
  const paletteColors = getColorPalette(
    draft.legend.palette,
    draft.legend.steps,
    draft.legend.reverseColors
  );

  const currentRules: LegendStep[] = draft.legend.rules || defaultLegendSteps;
  const stepsValid =
    draft.type !== 'steps' ||
    currentRules.every((step) => step.label?.trim() && typeof step.value === 'number');

  const isFormValid = draft.type === 'gradient' ? boundsValidRange : stepsValid;

  const errors =
    !boundsValidRange && draft.type === 'gradient'
      ? [
          i18n.translate('xpack.infra.legendControls.boundRangeError', {
            defaultMessage: 'Minimum must be smaller than the maximum',
          }),
        ]
      : [];

  return (
    <EuiPopover
      isOpen={isPopoverOpen}
      closePopover={handleCancelClick}
      id="legendControls"
      button={buttonComponent}
      anchorPosition="leftCenter"
      data-test-subj="legendControls"
    >
      <EuiPopoverTitle>
        {i18n.translate('xpack.infra.legendControls.legendOptionsPopoverTitleLabel', {
          defaultMessage: 'Legend Options',
        })}
      </EuiPopoverTitle>
      <EuiButtonGroup
        color="primary"
        idSelected={draft.type}
        isFullWidth={true}
        legend={i18n.translate('xpack.infra.legendControls.legendOptionsPopoverTypeLabel', {
          defaultMessage: 'Legend type',
        })}
        options={[
          {
            id: 'gradient',
            label: i18n.translate(
              'xpack.infra.legendControls.legendOptionsPopoverTypeLabelGradient',
              {
                defaultMessage: 'Gradient',
              }
            ),
          },
          {
            id: 'steps',
            label: i18n.translate('xpack.infra.legendControls.legendOptionsPopoverTypeLabelSteps', {
              defaultMessage: 'Steps',
            }),
          },
        ]}
        onChange={(id) => setDraft((prev) => ({ ...prev, type: id as 'gradient' | 'steps' }))}
        type="single"
      />
      <EuiSpacer size="s" />
      <StyledEuiForm>
        {draft.type === 'gradient' && (
          <>
            <EuiFormRow
              display="columnCompressed"
              label={i18n.translate('xpack.infra.legendControls.colorPaletteLabel', {
                defaultMessage: 'Color palette',
              })}
            >
              <>
                <EuiSelect
                  aria-label={i18n.translate('xpack.infra.legendControls.colorPalette.ariaLabel', {
                    defaultMessage: 'Color palette selection',
                  })}
                  options={PALETTE_OPTIONS}
                  value={draft.legend.palette}
                  id="palette"
                  onChange={handlePaletteChange}
                  compressed
                  data-test-subj="legendControlsPalette"
                />
                <EuiSpacer size="m" />
                <PalettePreview
                  palette={draft.legend.palette}
                  steps={draft.legend.steps}
                  reverse={draft.legend.reverseColors}
                />
              </>
            </EuiFormRow>
            <EuiFormRow
              display="columnCompressed"
              label={i18n.translate('xpack.infra.legendControls.stepsLabel', {
                defaultMessage: 'Number of colors',
              })}
            >
              <EuiRange
                id="steps"
                min={2}
                max={18}
                step={1}
                value={draft.legend.steps}
                onChange={handleStepsChange}
                showValue
                fullWidth
              />
            </EuiFormRow>
            <EuiFormRow
              fullWidth
              display="columnCompressed"
              label={i18n.translate('xpack.infra.legendControls.reverseDirectionLabel', {
                defaultMessage: 'Reverse direction',
              })}
            >
              <EuiSwitch
                showLabel={false}
                name="reverseColors"
                label={i18n.translate('xpack.infra.legendControls.euiSwitch.reversecolorsLabel', {
                  defaultMessage: 'Reverse colors direction',
                })}
                checked={draft.legend.reverseColors}
                onChange={handleReverseColors}
                compressed
              />
            </EuiFormRow>
            <EuiFormRow
              fullWidth
              display="columnCompressed"
              label={i18n.translate('xpack.infra.legendControls.switchLabel', {
                defaultMessage: 'Auto calculate range',
              })}
            >
              <EuiSwitch
                showLabel={false}
                name="bounds"
                label={i18n.translate('xpack.infra.legendControls.euiSwitch.boundsLabel', {
                  defaultMessage: 'Auto calculate range',
                })}
                checked={draft.auto}
                onChange={handleAutoChange}
                compressed
              />
            </EuiFormRow>
            <EuiFormRow
              fullWidth
              label={
                <ColorLabel
                  paletteSelected={draft.legend.palette}
                  color={first(paletteColors)!}
                  label={i18n.translate('xpack.infra.legendControls.minLabel', {
                    defaultMessage: 'Minimum',
                  })}
                />
              }
              isInvalid={!boundsValidRange}
              display="columnCompressed"
              error={errors}
            >
              <div style={{ maxWidth: 150 }}>
                <EuiFieldNumber
                  data-test-subj="infraLegendControlsFieldNumber"
                  disabled={draft.auto}
                  step={1}
                  value={isNaN(draft.bounds.min) ? '' : draft.bounds.min}
                  isInvalid={!boundsValidRange}
                  name="legendMin"
                  onChange={handleMinBounds}
                  append="%"
                  compressed
                />
              </div>
            </EuiFormRow>
            <EuiFormRow
              fullWidth
              display="columnCompressed"
              label={
                <ColorLabel
                  paletteSelected={draft.legend.palette}
                  color={last(paletteColors)!}
                  label={i18n.translate('xpack.infra.legendControls.maxLabel', {
                    defaultMessage: 'Maximum',
                  })}
                />
              }
              isInvalid={!boundsValidRange}
              error={errors}
            >
              <div style={{ maxWidth: 150 }}>
                <EuiFieldNumber
                  data-test-subj="infraLegendControlsFieldNumber"
                  disabled={draft.auto}
                  step={1}
                  isInvalid={!boundsValidRange}
                  value={isNaN(draft.bounds.max) ? '' : draft.bounds.max}
                  name="legendMax"
                  onChange={handleMaxBounds}
                  append="%"
                  compressed
                />
              </div>
            </EuiFormRow>
          </>
        )}
        {draft.type === 'steps' && (
          <LegendSteps
            steps={draft.legend.rules ?? defaultLegendSteps}
            onChange={handleRulesChange}
          />
        )}
        <EuiSpacer size="m" />
        <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              aria-label={i18n.translate('xpack.infra.legendControls.cancelButton.ariaLabel', {
                defaultMessage: 'Cancel',
              })}
              data-test-subj="infraLegendControlsCancelButton"
              type="submit"
              size="s"
              onClick={handleCancelClick}
            >
              <FormattedMessage
                id="xpack.infra.legendControls.cancelButton"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              type="submit"
              size="s"
              fill
              disabled={commited || !isFormValid}
              onClick={handleApplyClick}
              data-test-subj="applyLegendControlsButton"
            >
              <FormattedMessage
                id="xpack.infra.legendControls.applyButton"
                defaultMessage="Apply"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </StyledEuiForm>
    </EuiPopover>
  );
};

const StyledEuiForm = styled(EuiForm)`
  min-width: 400px;
  @media (max-width: 480px) {
    min-width: 100%;
    max-width: 100%;
    width: 100vw;
  }
`;
