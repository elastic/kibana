/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiBadge,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSelectable,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { AIConnector } from '@kbn/elastic-assistant';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { getDescription } from './get_description';
import * as i18n from '../translations';
import type { ConnectorFilterOptionData } from '../../types';

const LIST_PROPS = {
  isVirtualized: false,
  rowHeight: 60,
};

interface Props {
  aiConnectors: AIConnector[] | undefined;
  connectorFilterItems: Array<EuiSelectableOption<ConnectorFilterOptionData>>;
  connectorNames: string[] | undefined;
  isLoading?: boolean;
  setConnectorFilterItems: React.Dispatch<
    React.SetStateAction<Array<EuiSelectableOption<ConnectorFilterOptionData>>>
  >;
}

const ConnectorFilterComponent: React.FC<Props> = ({
  aiConnectors,
  connectorFilterItems,
  connectorNames,
  isLoading = false,
  setConnectorFilterItems,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onFilterButtonClick = useCallback(() => {
    setIsPopoverOpen((isOpen) => !isOpen);
  }, []);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const filterGroupPopoverId = useGeneratedHtmlId({
    prefix: 'connectorFilterGroupPopover',
  });

  // re-populate the items when the connectors or names change
  useEffect(() => {
    if (aiConnectors != null && connectorNames != null) {
      setConnectorFilterItems((prevItems) =>
        connectorNames.map((name) => {
          const connector = aiConnectors.find((x) => x.name === name);
          const previousItem = prevItems.find((item) => item.key === name);

          return {
            checked: previousItem?.checked ?? undefined,
            data: {
              description: getDescription(connector?.actionTypeId),
              deleted: connector == null,
            },
            label: name,
            key: name,
          };
        })
      );
    }
  }, [aiConnectors, connectorNames, setConnectorFilterItems]);

  const renderOption = useCallback(
    (option: EuiSelectableOption<ConnectorFilterOptionData>) => (
      <EuiFlexGroup
        css={css`
          height: 53px;
        `}
        data-test-subj="connectorFilterOption"
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

        <EuiFlexItem grow={true}>
          <EuiFlexGroup
            alignItems="center"
            gutterSize="none"
            responsive={false}
            justifyContent="spaceBetween"
          >
            <EuiFlexItem grow={true}>
              <EuiText
                color={option.deleted ? euiTheme.colors.textSubdued : undefined}
                css={css`
                  font-style: ${option.deleted ? 'italic' : 'normal'};
                `}
                data-test-subj="optionDescription"
                size="s"
              >
                {option.deleted ? i18n.DELETED : option.description}
              </EuiText>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              {option.deleted && (
                <EuiBadge
                  css={css`
                    color: ${euiTheme.colors.textDanger};
                    margin-left: ${euiTheme.size.s};
                  `}
                  color={euiTheme.colors.backgroundBaseDanger}
                  data-test-subj="deletedConnectorBadge"
                >
                  {i18n.DELETED}
                </EuiBadge>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [
      euiTheme.colors.backgroundBaseDanger,
      euiTheme.colors.textDanger,
      euiTheme.colors.textSubdued,
      euiTheme.size.s,
    ]
  );

  const button = useMemo(
    () => (
      <EuiFilterButton
        badgeColor="subdued"
        disabled={isLoading}
        iconType="arrowDown"
        isSelected={isPopoverOpen}
        onClick={onFilterButtonClick}
        hasActiveFilters={!!connectorFilterItems.find((item) => item.checked === 'on')}
        numActiveFilters={connectorFilterItems.filter((item) => item.checked === 'on').length}
      >
        {i18n.CONNECTOR}
      </EuiFilterButton>
    ),
    [connectorFilterItems, isLoading, isPopoverOpen, onFilterButtonClick]
  );

  const onSelectableChange = useCallback(
    (newOptions: EuiSelectableOption[]) => {
      setConnectorFilterItems(newOptions);
    },
    [setConnectorFilterItems]
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
          aria-label={i18n.CONNECTOR}
          listProps={LIST_PROPS}
          options={connectorFilterItems}
          onChange={onSelectableChange}
          renderOption={renderOption}
        >
          {(list) => (
            <div
              css={css`
                width: 260px;
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

ConnectorFilterComponent.displayName = 'ConnectorFilter';

export const ConnectorFilter = React.memo(ConnectorFilterComponent);
