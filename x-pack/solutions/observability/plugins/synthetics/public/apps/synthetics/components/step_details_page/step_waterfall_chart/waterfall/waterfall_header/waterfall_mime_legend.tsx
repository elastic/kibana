/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Dispatch, SetStateAction, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiText, EuiFlexGroup, EuiFlexItem, EuiButtonEmpty, useEuiTheme } from '@elastic/eui';

import { MIME_FILTERS, MimeType } from '../../../common/network_data/types';
import { colourPalette } from '../../../common/network_data/data_formatting';
import { WaterfallLegendItem } from './waterfall_legend_item';

interface Props {
  activeFilters: string[];
  setActiveFilters: Dispatch<SetStateAction<string[]>>;
  showCustomMarks: boolean;
  setShowCustomMarks: (val: boolean) => void;
}

export const WaterfallMimeLegend = ({
  activeFilters,
  setActiveFilters,
  showCustomMarks,
  setShowCustomMarks,
}: Props) => {
  const { euiTheme } = useEuiTheme();
  const addOrRemoveFilter = useCallback(
    (filter: MimeType) => {
      setActiveFilters((filters) => {
        const updated = filters.includes(filter)
          ? filters.filter((f) => f !== filter)
          : [...filters, filter];
        return updated.length === MIME_FILTERS.length ? [] : updated;
      });
    },
    [setActiveFilters]
  );

  const clearFilters = useCallback(() => {
    setActiveFilters([]);
  }, [setActiveFilters]);

  const anyFilterApplied = activeFilters.length > 0;

  return (
    <>
      <EuiFlexGroup direction="column" alignItems="flexStart" gutterSize="none">
        <EuiFlexItem css={{ height: 20, marginTop: 6, marginLeft: euiTheme.size.s }}>
          {!anyFilterApplied ? (
            <EuiText size="xs" color="subdued">
              {APPLY_FILTER_LABEL}
            </EuiText>
          ) : null}
        </EuiFlexItem>

        <EuiFlexGroup
          wrap={true}
          css={{ gap: `min(3%, ${euiTheme.size.l})`, width: '100%', padding: euiTheme.size.s }}
        >
          {MIME_FILTERS.map((f) => (
            <WaterfallLegendItem
              key={f.mimeType}
              id={f.mimeType}
              color={colourPalette[f.mimeType]}
              label={f.label}
              isClickable={true}
              isActive={!activeFilters.length || activeFilters.includes(f.mimeType)}
              onClick={addOrRemoveFilter}
            />
          ))}
        </EuiFlexGroup>

        <EuiFlexGroup css={{ height: 24, width: '100%' }} justifyContent="spaceBetween">
          <EuiFlexItem css={{ maxWidth: 'fit-content' }}>
            {anyFilterApplied ? (
              <EuiButtonEmpty
                data-test-subj="syntheticsWaterfallLegendButton"
                size="xs"
                onClick={clearFilters}
              >
                {CLEAR_FILTER_LABEL}
              </EuiButtonEmpty>
            ) : null}
          </EuiFlexItem>

          <EuiButtonEmpty
            data-test-subj="syntheticsWaterfallCustomMarksButton"
            size="xs"
            iconType={showCustomMarks ? 'eye' : 'eyeClosed'}
            iconSize="s"
            onClick={() => {
              setShowCustomMarks(!showCustomMarks);
            }}
          >
            {CUSTOM_MARKS_LABEL}
          </EuiButtonEmpty>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </>
  );
};

const APPLY_FILTER_LABEL = i18n.translate('xpack.synthetics.waterfall.applyFilters.label', {
  defaultMessage: 'Select an item to apply filter',
});

const CLEAR_FILTER_LABEL = i18n.translate('xpack.synthetics.waterfall.clearFilters.label', {
  defaultMessage: 'Clear filters',
});

const CUSTOM_MARKS_LABEL = i18n.translate('xpack.synthetics.waterfall.customMarks.label', {
  defaultMessage: 'Custom marks',
});
