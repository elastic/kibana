/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiPopover,
  EuiFilterButton,
  EuiSelectable,
  EuiFilterGroup,
  EuiPopoverTitle,
  EuiButtonEmpty,
  EuiPopoverFooter,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { coverageOverviewFilterWidth } from './constants';
import type { AtlasPlatform } from './atlas_platforms';
import { ATLAS_PLATFORMS } from './atlas_platforms';
import { populateSelected, extractSelected } from './helpers';
import * as i18n from './translations';

const atlasPlatformFilterOptions: Array<EuiSelectableOption<{ label: AtlasPlatform }>> =
  ATLAS_PLATFORMS.map((platform) => ({ label: platform }));

export interface AtlasPlatformFilterProps {
  selected: AtlasPlatform[];
  onChange: (selected: AtlasPlatform[]) => void;
  isLoading?: boolean;
}

const AtlasPlatformFilterComponent = ({
  selected,
  onChange,
  isLoading = false,
}: AtlasPlatformFilterProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverTitleId = useGeneratedHtmlId();

  const onButtonClick = useCallback(() => {
    setIsPopoverOpen(!isPopoverOpen);
  }, [isPopoverOpen]);

  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  const numActiveFilters = useMemo(() => selected.length, [selected]);

  const options = populateSelected(atlasPlatformFilterOptions, selected);

  const handleSelectableOnChange = useCallback(
    (newOptions: Array<EuiSelectableOption<{ label: AtlasPlatform }>>) => {
      onChange(extractSelected<AtlasPlatform>(newOptions));
    },
    [onChange]
  );

  const handleOnClear = useCallback(() => {
    onChange([]);
  }, [onChange]);

  const button = useMemo(
    () => (
      <EuiFilterButton
        data-test-subj="atlasCoveragePlatformFilterButton"
        isLoading={isLoading}
        iconType="chevronSingleDown"
        onClick={onButtonClick}
        isSelected={isPopoverOpen}
        hasActiveFilters={numActiveFilters > 0}
        numActiveFilters={numActiveFilters}
      >
        {i18n.ATLAS_FILTER_BY_PLATFORMS}
      </EuiFilterButton>
    ),
    [isLoading, isPopoverOpen, numActiveFilters, onButtonClick]
  );

  return (
    <EuiFilterGroup
      data-test-subj="atlasCoveragePlatformFilter"
      css={css`
        width: ${coverageOverviewFilterWidth}px;
      `}
    >
      <EuiPopover
        id="atlasPlatformFilterPopover"
        button={button}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        aria-labelledby={popoverTitleId}
      >
        <EuiPopoverTitle id={popoverTitleId} paddingSize="s">
          {i18n.CoverageOverviewFilterPopoverTitle}
        </EuiPopoverTitle>
        <EuiSelectable<{ label: AtlasPlatform }>
          data-test-subj="atlasCoveragePlatformFilterList"
          options={options}
          onChange={handleSelectableOnChange}
          listProps={{ paddingSize: 's' }}
        >
          {(list) => (
            <div
              css={css`
                width: ${coverageOverviewFilterWidth}px;
              `}
            >
              {list}
            </div>
          )}
        </EuiSelectable>
        <EuiPopoverFooter paddingSize="xs">
          <EuiButtonEmpty
            css={css`
              width: 100%;
            `}
            iconType="cross"
            color="danger"
            size="xs"
            isDisabled={numActiveFilters === 0}
            onClick={handleOnClear}
          >
            {i18n.CoverageOverviewFilterPopoverClearAll}
          </EuiButtonEmpty>
        </EuiPopoverFooter>
      </EuiPopover>
    </EuiFilterGroup>
  );
};

export const AtlasPlatformFilter = React.memo(AtlasPlatformFilterComponent);
