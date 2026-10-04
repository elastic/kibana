/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiSelectableProps, FilterChecked } from '@elastic/eui';
import { EuiButton, EuiFilterButton, EuiPopover, EuiSelectable, EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useBoolState } from '../../../common/hooks/use_bool_state';
import { WatchlistsFlyoutKey } from '../../../flyout/entity_details/shared/constants';
import { useWatchlistsPrivileges } from '../../api/hooks/use_watchlists_privileges';

const LIST_MAX_HEIGHT = 128;
const POPOVER_WIDTH = 220;

const CREATE_WATCHLIST_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.filter.watchlist.createButtonAriaLabel',
  { defaultMessage: 'Create watchlist' }
);

interface WatchlistOption {
  originalItem: string;
  label: string;
  checked?: FilterChecked;
}

interface WatchlistFilterProps {
  title: string;
  items: string[];
  selectedItems: string[];
  onSelectionChange: (selectedItems: string[]) => void;
  renderItem: (id: string) => React.ReactNode;
  disabled?: boolean;
  spaceId: string | undefined;
}

export const WatchlistFilter: React.FC<WatchlistFilterProps> = ({
  title,
  items,
  selectedItems,
  onSelectionChange,
  renderItem,
  disabled = false,
  spaceId,
}) => {
  const [isPopoverOpen, , closePopover, togglePopover] = useBoolState();
  const { openFlyout } = useExpandableFlyoutApi();
  const {
    data: watchlistPrivileges,
    error: watchlistPrivilegesError,
    isLoading: isWatchlistPrivilegesLoading,
  } = useWatchlistsPrivileges();
  const canCreateWatchlist =
    !isWatchlistPrivilegesLoading &&
    !watchlistPrivilegesError &&
    (watchlistPrivileges?.has_all_required ?? false);

  const options: WatchlistOption[] = useMemo(() => {
    const checked: FilterChecked = 'on';
    return items.map((item) => ({
      originalItem: item,
      label: item,
      checked: selectedItems.includes(item) ? checked : undefined,
    }));
  }, [items, selectedItems]);

  const onChange = useCallback<NonNullable<EuiSelectableProps<WatchlistOption>['onChange']>>(
    (newItems) => {
      onSelectionChange(
        newItems.filter(({ checked }) => checked === 'on').map(({ originalItem }) => originalItem)
      );
    },
    [onSelectionChange]
  );

  const openCreateWatchlistFlyout = useCallback(() => {
    closePopover();
    openFlyout({
      right: {
        id: WatchlistsFlyoutKey,
        params: {
          mode: 'create',
          spaceId,
        },
      },
    });
  }, [closePopover, openFlyout, spaceId]);

  return (
    <EuiPopover
      aria-label={title}
      data-test-subj="entityFiltersBarWatchlist"
      button={
        <EuiFilterButton
          data-test-subj="entityFiltersBarWatchlist-popoverButton"
          iconType="chevronSingleDown"
          grow={false}
          numFilters={items.length}
          numActiveFilters={selectedItems.length}
          hasActiveFilters={selectedItems.length > 0}
          isSelected={isPopoverOpen}
          disabled={disabled}
          onClick={togglePopover}
        >
          {title}
        </EuiFilterButton>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="s"
      repositionOnScroll
    >
      <EuiSelectable
        data-test-subj="entityFiltersBarWatchlist-item"
        onChange={onChange}
        options={options}
        renderOption={({ originalItem }) => renderItem(originalItem)}
        listProps={{ isVirtualized: false }}
      >
        {(list) => (
          <div style={{ width: POPOVER_WIDTH }}>
            <div
              css={css`
                max-block-size: ${LIST_MAX_HEIGHT}px;
                overflow-y: auto;
              `}
            >
              {list}
            </div>
            <EuiSpacer size="s" />
            <EuiButton
              fill
              fullWidth
              iconType="plusInCircle"
              aria-label={CREATE_WATCHLIST_LABEL}
              data-test-subj="entityFiltersBarCreateWatchlist"
              isDisabled={!canCreateWatchlist}
              onClick={openCreateWatchlistFlyout}
            >
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.home.filter.watchlist.createButtonLabel"
                defaultMessage="Create watchlist"
              />
            </EuiButton>
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};
