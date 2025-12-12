/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiPopover,
  EuiSelectable,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo, useState } from 'react';

import * as i18n from '../translations';
import { useInvalidateFindAttackDiscoveries } from '../../../../use_find_attack_discoveries';

interface Props {
  isLoading?: boolean;
  setStatusItems: React.Dispatch<React.SetStateAction<EuiSelectableOption[]>>;
  statusItems: EuiSelectableOption[];
}

const StatusFilterComponent: React.FC<Props> = ({
  isLoading = false,
  setStatusItems,
  statusItems,
}) => {
  const invalidateFindAttackDiscoveries = useInvalidateFindAttackDiscoveries();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onFilterButtonClick = useCallback(() => {
    setIsPopoverOpen((isOpen) => !isOpen);
  }, []);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const filterGroupPopoverId = useGeneratedHtmlId({
    prefix: 'statusFilterGroupPopover',
  });

  const button = useMemo(
    () => (
      <EuiFilterButton
        badgeColor="subdued"
        data-test-subj="statusFilterButton"
        disabled={isLoading}
        iconType="arrowDown"
        isSelected={isPopoverOpen}
        onClick={onFilterButtonClick}
        hasActiveFilters={!!statusItems.find((item) => item.checked === 'on')}
        numActiveFilters={statusItems.filter((item) => item.checked === 'on').length}
      >
        {i18n.STATUS}
      </EuiFilterButton>
    ),
    [isLoading, isPopoverOpen, onFilterButtonClick, statusItems]
  );

  const onSelectableChange = useCallback(
    (newOptions: EuiSelectableOption[]) => {
      setStatusItems(newOptions);
      invalidateFindAttackDiscoveries();
    },
    [invalidateFindAttackDiscoveries, setStatusItems]
  );

  return (
    <EuiFilterGroup>
      <EuiPopover
        button={button}
        closePopover={closePopover}
        data-test-subj="statusFilterPopover"
        id={filterGroupPopoverId}
        isOpen={isPopoverOpen}
        panelPaddingSize="none"
      >
        <EuiSelectable
          aria-label={i18n.STATUS}
          data-test-subj="statusFilterSelectable"
          onChange={onSelectableChange}
          options={statusItems}
        >
          {(list) => (
            <div
              css={css`
                width: 200px;
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

export const StatusFilter = React.memo(StatusFilterComponent);
