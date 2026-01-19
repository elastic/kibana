/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFilterButton,
  EuiFilterGroup,
  EuiPopover,
  EuiSelectable,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo, useState } from 'react';

import * as i18n from '../translations';
import { useInvalidateFindAttackDiscoveries } from '../../../../use_find_attack_discoveries';

const LIST_PROPS = {
  isVirtualized: false,
  rowHeight: 60,
};

const ONLY_VISIBLE_TO_ME = 'only-visible-to-me';
const SHARED_KEY = 'shared';

interface VisibilityFilterOptionData {
  description?: string;
}

interface Props {
  isLoading?: boolean;
  setShared: React.Dispatch<React.SetStateAction<boolean | undefined>>;
  /**
   * `undefined`: show both shared, and only visible to me Attack discoveries. `true`: show only shared Attack discoveries. `false`: show only visible to me Attack discoveries.
   */
  shared?: boolean;
}

const VisibilityFilterComponent: React.FC<Props> = ({ isLoading = false, setShared, shared }) => {
  const invalidateFindAttackDiscoveries = useInvalidateFindAttackDiscoveries();

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onFilterButtonClick = useCallback(() => {
    setIsPopoverOpen((isOpen) => !isOpen);
  }, []);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const filterGroupPopoverId = useGeneratedHtmlId({
    prefix: 'visibilityFilterGroupPopover',
  });

  const [items, setItems] = useState<Array<EuiSelectableOption<VisibilityFilterOptionData>>>([
    {
      checked: !shared ? 'on' : undefined,
      data: {
        description: i18n.ONLY_VISIBLE_TO_YOU,
      },
      'data-test-subj': 'onlyVisibleToMe',
      key: ONLY_VISIBLE_TO_ME,
      label: i18n.NOT_SHARED,
    },
    {
      checked: shared === undefined || shared ? 'on' : undefined,
      data: {
        description: i18n.VISIBLE_TO_YOUR_TEAM,
      },
      'data-test-subj': 'shared',
      key: SHARED_KEY,
      label: i18n.SHARED,
    },
  ]);

  const renderOption = useCallback(
    (option: EuiSelectableOption<VisibilityFilterOptionData>) => (
      <EuiFlexGroup
        css={css`
          height: 53px;
          width: 132px;
        `}
        direction="column"
        gutterSize="none"
        justifyContent="center"
      >
        <EuiFlexItem grow={false}>
          <EuiText
            css={css`
              font-weight: bold;
            `}
            data-test-subj="optionLabel"
            size="s"
          >
            {option.label}
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiText data-test-subj="optionDescription" size="s">
            {option.description}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    []
  );

  const button = useMemo(
    () => (
      <EuiFilterButton
        badgeColor="subdued"
        disabled={isLoading}
        iconType="arrowDown"
        isSelected={isPopoverOpen}
        onClick={onFilterButtonClick}
        hasActiveFilters={!!items.find((item) => item.checked === 'on')}
        numActiveFilters={items.filter((item) => item.checked === 'on').length}
      >
        {i18n.VISIBILITY}
      </EuiFilterButton>
    ),
    [isLoading, isPopoverOpen, items, onFilterButtonClick]
  );

  const onSelectableChange = useCallback(
    (newOptions: EuiSelectableOption[]) => {
      const newOnlyVisibleToMeOption = newOptions.find(
        (option) => option.key === ONLY_VISIBLE_TO_ME
      );
      const newSharedOption = newOptions.find((option) => option.key === SHARED_KEY);

      const isOnlyVisibleToMeChecked = newOnlyVisibleToMeOption?.checked === 'on';
      const isSharedChecked = newSharedOption?.checked === 'on';

      if (
        (isOnlyVisibleToMeChecked && isSharedChecked) ||
        (!isOnlyVisibleToMeChecked && !isSharedChecked)
      ) {
        setShared(undefined);
      } else {
        setShared(isSharedChecked);
      }

      setItems(newOptions);
      invalidateFindAttackDiscoveries();
    },
    [invalidateFindAttackDiscoveries, setShared]
  );

  return (
    <EuiFilterGroup>
      <EuiPopover
        button={button}
        closePopover={closePopover}
        id={filterGroupPopoverId}
        isOpen={isPopoverOpen}
        panelPaddingSize="none"
      >
        <EuiSelectable
          aria-label={i18n.VISIBILITY}
          listProps={LIST_PROPS}
          options={items}
          onChange={onSelectableChange}
          renderOption={renderOption}
        >
          {(list) => (
            <div
              css={css`
                width: 230px;
              `}
            >
              {list}
            </div>
          )}
        </EuiSelectable>
      </EuiPopover>
    </EuiFilterGroup>
  );
};

VisibilityFilterComponent.displayName = 'VisibilityFilter';

export const VisibilityFilter = React.memo(VisibilityFilterComponent);
