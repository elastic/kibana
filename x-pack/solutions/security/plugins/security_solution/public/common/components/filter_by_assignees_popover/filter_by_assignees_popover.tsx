/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';

import { i18n } from '@kbn/i18n';
import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiPopover,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';

import type { AssigneesIdsSelection } from '../assignees/types';
import { useLicense } from '../../hooks/use_license';
import { useUpsellingMessage } from '../../hooks/use_upselling';
import { ASSIGNEES_PANEL_WIDTH } from '../assignees/constants';
import { AssigneesSelectable } from '../assignees/assignees_selectable';
import { FILTER_BY_ASSIGNEES_BUTTON } from './test_ids';

export interface FilterByAssigneesPopoverProps {
  /**
   * Selected user ids to filter alerts by
   */
  selectedUserIds: AssigneesIdsSelection[];

  /**
   * Callback to handle changing of the assignees selection
   */
  onSelectionChange?: (users: AssigneesIdsSelection[]) => void;
  /**
   * Renders a shorter button that matches compressed form controls.
   */
  compressed?: boolean;
  /**
   * Stretch the control to the full width of its flex/grid cell (e.g. equal-width filter bar columns).
   */
  fillFilterCell?: boolean;
}

/**
 * The popover to filter alerts by assigned users
 */
const fillFilterCellStyles = {
  group: css({
    width: '100%',
    minWidth: 0,
  }),
  toolTip: css({
    width: '100%',
  }),
  filterButton: css({
    width: '100%',
  }),
};

export const FilterByAssigneesPopover: FC<FilterByAssigneesPopoverProps> = memo(
  ({ selectedUserIds, onSelectionChange, compressed = false, fillFilterCell = false }) => {
    const isPlatinumPlus = useLicense().isPlatinumPlus();
    const upsellingMessage = useUpsellingMessage('alert_assignments');

    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const togglePopover = useCallback(() => setIsPopoverOpen((value) => !value), []);

    const searchInputId = useGeneratedHtmlId({
      prefix: 'searchInput',
    });

    const tooltipContent =
      upsellingMessage ??
      i18n.translate('xpack.securitySolution.filtersGroup.assignees.popoverTooltip', {
        defaultMessage: 'Filter by assignee',
      });

    const assigneesButtonLabel = i18n.translate(
      'xpack.securitySolution.filtersGroup.assignees.buttonTitle',
      {
        defaultMessage: 'Assignees',
      }
    );

    const button = useMemo(
      () => (
        <EuiToolTip
          display="block"
          position="bottom"
          content={tooltipContent}
          css={fillFilterCell ? fillFilterCellStyles.toolTip : undefined}
        >
          <EuiFilterButton
            data-test-subj={FILTER_BY_ASSIGNEES_BUTTON}
            iconType="arrowDown"
            badgeColor="subdued"
            disabled={!isPlatinumPlus}
            onClick={togglePopover}
            isSelected={isPopoverOpen}
            hasActiveFilters={selectedUserIds.length > 0}
            numActiveFilters={selectedUserIds.length}
            size={compressed ? (fillFilterCell ? 'xs' : 's') : 'm'}
            css={fillFilterCell ? fillFilterCellStyles.filterButton : undefined}
          >
            {assigneesButtonLabel}
          </EuiFilterButton>
        </EuiToolTip>
      ),
      [
        assigneesButtonLabel,
        compressed,
        fillFilterCell,
        isPlatinumPlus,
        isPopoverOpen,
        selectedUserIds.length,
        togglePopover,
        tooltipContent,
      ]
    );

    const popover = (
      <EuiPopover
        panelPaddingSize="none"
        initialFocus={`[id="${searchInputId}"]`}
        button={button}
        isOpen={isPopoverOpen}
        panelStyle={{
          minWidth: ASSIGNEES_PANEL_WIDTH,
        }}
        closePopover={togglePopover}
      >
        <AssigneesSelectable
          searchInputId={searchInputId}
          assignedUserIds={selectedUserIds}
          showUnassignedOption={true}
          onSelectionChange={onSelectionChange}
        />
      </EuiPopover>
    );

    return (
      <EuiFilterGroup
        compressed={compressed}
        css={fillFilterCell ? fillFilterCellStyles.group : undefined}
      >
        {popover}
      </EuiFilterGroup>
    );
  }
);

FilterByAssigneesPopover.displayName = 'FilterByAssigneesPopover';
