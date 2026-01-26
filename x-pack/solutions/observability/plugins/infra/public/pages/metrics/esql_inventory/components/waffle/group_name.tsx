/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  EuiPopover,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiButtonIcon,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import type { FilterAction } from './waffle_context';

interface GroupNameProps {
  /** Display name of the group (the value) */
  name: string;
  /** Number of items in the group */
  count: number;
  /** Whether this is a nested child group */
  isChild?: boolean;
  /** Field name for filtering */
  fieldName?: string;
  /** Filter handler */
  onFilter?: (field: string, value: string, action: FilterAction) => void;
}

/**
 * Floating group name component - pill positioned above the group.
 * Displays the group name with a count badge and filter actions.
 */
export const GroupName: React.FC<GroupNameProps> = ({
  name,
  count,
  isChild = false,
  fieldName,
  onFilter,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handleFilterFor = useCallback(() => {
    if (fieldName && onFilter) {
      onFilter(fieldName, name, 'include');
    }
    setIsPopoverOpen(false);
  }, [fieldName, name, onFilter]);

  const handleFilterOut = useCallback(() => {
    if (fieldName && onFilter) {
      onFilter(fieldName, name, 'exclude');
    }
    setIsPopoverOpen(false);
  }, [fieldName, name, onFilter]);

  const canFilter = fieldName && onFilter;

  const button = (
    <EuiButtonEmpty
      data-test-subj="esqlWaffleGroupNameButton"
      size="xs"
      onClick={() => canFilter && setIsPopoverOpen(!isPopoverOpen)}
      css={css`
        max-width: 200px;
        .euiButtonEmpty__text {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `}
    >
      {name}
    </EuiButtonEmpty>
  );

  const filterActions = canFilter ? (
    <EuiFlexGroup gutterSize="none" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={i18n.translate('xpack.infra.esqlInventory.groupName.filterFor', {
            defaultMessage: 'Filter for this {field}',
            values: { field: fieldName },
          })}
        >
          <EuiButtonIcon
            data-test-subj="esqlWaffleGroupFilterForButton"
            iconType="plusInCircle"
            aria-label={i18n.translate('xpack.infra.esqlInventory.groupName.filterForAriaLabel', {
              defaultMessage: 'Filter for {field}: {value}',
              values: { field: fieldName, value: name },
            })}
            onClick={handleFilterFor}
            size="xs"
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={i18n.translate('xpack.infra.esqlInventory.groupName.filterOut', {
            defaultMessage: 'Filter out this {field}',
            values: { field: fieldName },
          })}
        >
          <EuiButtonIcon
            data-test-subj="esqlWaffleGroupFilterOutButton"
            iconType="minusInCircle"
            aria-label={i18n.translate('xpack.infra.esqlInventory.groupName.filterOutAriaLabel', {
              defaultMessage: 'Filter out {field}: {value}',
              values: { field: fieldName, value: name },
            })}
            onClick={handleFilterOut}
            size="xs"
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : null;

  return (
    <EuiFlexGroup
      justifyContent="center"
      responsive={false}
      css={css`
        position: relative;
        font-size: ${isChild ? '0.85em' : '1em'};
        margin-bottom: -${euiTheme.size.xs};
        padding: 0 ${euiTheme.size.s};
        z-index: ${euiTheme.levels.header};
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          gutterSize="none"
          alignItems="center"
          responsive={false}
          css={css`
            border: ${euiTheme.border.thin};
            background-color: ${isChild
              ? euiTheme.colors.backgroundBasePrimary
              : euiTheme.colors.backgroundBaseNeutral};
            border-radius: ${euiTheme.border.radius.small};
            box-shadow: 0px 2px 0px 0px ${euiTheme.colors.borderBasePlain};
            overflow: hidden;
            max-width: 100%;
          `}
        >
          <EuiFlexItem grow={false}>
            {canFilter ? (
              <EuiPopover
                button={button}
                isOpen={isPopoverOpen}
                closePopover={() => setIsPopoverOpen(false)}
                panelPaddingSize="s"
                anchorPosition="upCenter"
              >
                <EuiFlexGroup direction="column" gutterSize="xs">
                  <EuiFlexItem>
                    <strong>{name}</strong>
                  </EuiFlexItem>
                  <EuiFlexItem>{filterActions}</EuiFlexItem>
                </EuiFlexGroup>
              </EuiPopover>
            ) : (
              <EuiToolTip position="top" content={name}>
                {button}
              </EuiToolTip>
            )}
          </EuiFlexItem>
          <EuiFlexItem
            grow={false}
            css={css`
              border-left: ${euiTheme.border.thin};
              padding: ${euiTheme.size.xs} ${euiTheme.size.s};
            `}
          >
            <EuiBadge color="hollow">{count}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
