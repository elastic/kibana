/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiPopover,
  EuiSelectable,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

import {
  FACELIFT_VERSION_OPTIONS,
  useActiveFaceliftVersion,
  type FaceliftVersion,
} from '../../../entity_analytics/components/home/facelift/active_version';

const LABEL = i18n.translate('xpack.securitySolution.globalHeader.faceliftPrototypeVersionLabel', {
  defaultMessage: 'Prototype version:',
});

const SELECT_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.globalHeader.faceliftPrototypeVersionAriaLabel',
  { defaultMessage: 'Prototype version' }
);

type VersionOption = EuiSelectableOption & { key: FaceliftVersion };

/**
 * Single-select prototype version control for the Kibana chrome header
 * (shown left of Add integrations on Entity analytics home).
 * Filter-style trigger; panel uses EuiSelectable with `singleSelection`.
 */
export const FaceliftVersionHeaderControl: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const [faceliftVersion, setFaceliftVersion] = useActiveFaceliftVersion();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const selectedLabel =
    FACELIFT_VERSION_OPTIONS.find((option) => option.key === faceliftVersion)?.label ??
    faceliftVersion;

  const options = useMemo<VersionOption[]>(
    () =>
      FACELIFT_VERSION_OPTIONS.map((option) => ({
        key: option.key,
        label: option.label,
        checked: option.key === faceliftVersion ? 'on' : undefined,
      })),
    [faceliftVersion]
  );

  const onButtonClick = useCallback(() => {
    setIsPopoverOpen((open) => !open);
  }, []);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const onSelectableChange = useCallback(
    (newOptions: VersionOption[]) => {
      const selected = newOptions.find((option) => option.checked === 'on');
      if (selected?.key) {
        setFaceliftVersion(selected.key);
      }
      setIsPopoverOpen(false);
    },
    [setFaceliftVersion]
  );

  const button = (
    <EuiFilterGroup compressed>
      <EuiFilterButton
        iconType="chevronSingleDown"
        grow={false}
        hasActiveFilters
        isSelected={isPopoverOpen}
        onClick={onButtonClick}
        aria-label={SELECT_ARIA_LABEL}
        data-test-subj="eaFaceliftVersionSelect"
      >
        {selectedLabel}
      </EuiFilterButton>
    </EuiFilterGroup>
  );

  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      responsive={false}
      data-test-subj="eaFaceliftVersionHeaderControl"
    >
      <EuiFlexItem grow={false}>
        <EuiFormLabel>{LABEL}</EuiFormLabel>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPopover
          button={button}
          isOpen={isPopoverOpen}
          closePopover={closePopover}
          panelPaddingSize="none"
          anchorPosition="downRight"
        >
          <EuiSelectable<VersionOption>
            aria-label={SELECT_ARIA_LABEL}
            options={options}
            onChange={onSelectableChange}
            singleSelection={true}
            searchable={false}
            listProps={{ showIcons: true }}
            data-test-subj="eaFaceliftVersionSelectable"
          >
            {(list) => (
              <div
                css={css`
                  width: ${euiTheme.base * 8}px; /* 128px — fits v.1 / v.2 / v.3 */
                `}
              >
                {list}
              </div>
            )}
          </EuiSelectable>
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
