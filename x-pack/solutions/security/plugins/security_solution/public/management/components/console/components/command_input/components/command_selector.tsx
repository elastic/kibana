/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useCallback } from 'react';
import { css } from '@emotion/react';
import {
  EuiSelectable,
  type EuiSelectableProps,
  type EuiSelectableOption,
  EuiSpacer,
  htmlIdGenerator,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiText,
  EuiTextTruncate,
} from '@elastic/eui';
import type { CommandDefinition } from '../../..';
import { useConsoleStateDispatch } from '../../../hooks/state_selectors/use_console_state_dispatch';
import { getCommandNameWithArgs } from '../../../service/utils';
import { UserCommandInput } from '../../user_command_input';
import { useWithCommandList } from '../../../hooks/state_selectors/use_with_command_list';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';

export interface CommandSelectorProps {
  /**
   * The HTML `id` that will be added to the element that should have focus when this component
   * is rendered. Useful when using it with `EuiPopover`'s `initialFocus` prop.
   */
  initialFocusId?: string;
  'data-test-subj'?: string;
}

export const CommandSelector = memo<CommandSelectorProps>(
  ({ initialFocusId = htmlIdGenerator()(), 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const commandDefinitions = useWithCommandList();
    const dispatch = useConsoleStateDispatch();

    const selectorOptions: EuiSelectableOption<CommandDefinition>[] = useMemo(() => {
      const options: EuiSelectableOption<CommandDefinition>[] = [];

      for (const commandDefinition of commandDefinitions.sort((a, b) =>
        a.name.localeCompare(b.name)
      )) {
        options.push({
          label: getCommandNameWithArgs(commandDefinition),
          key: commandDefinition.name,
          data: commandDefinition,
        });
      }

      return options;
    }, [commandDefinitions]);

    const searchBarProps = useMemo(() => {
      return {
        // FIXME:PT add placeholder text
        // placeholder: FILTER_HISTORY_PLACEHOLDER,
        compressed: true,
        fullWidth: true,
        id: initialFocusId,
      };
    }, [initialFocusId]);

    const selectableListProps: EuiSelectableProps['listProps'] = useMemo(() => {
      return {
        showIcons: false,
        bordered: true,
      };
    }, []);

    const handleRenderOption = useCallback<
      NonNullable<EuiSelectableProps<CommandDefinition>['renderOption']>
    >(
      (option) => {
        return (
          <EuiFlexGroup responsive={false}>
            <EuiFlexItem
              grow={false}
              css={css`
                min-width: 240px;
                width: 15vw;
              `}
            >
              <div>
                <EuiBadge data-test-subj={getTestId('commandName')}>
                  <UserCommandInput input={option.label} />
                </EuiBadge>
              </div>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText color="subdued" size="xs">
                <EuiTextTruncate text={option.about} />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      },
      [getTestId]
    );

    const handleSelectableOnChange: EuiSelectableProps['onChange'] = useCallback(
      (items) => {
        dispatch({ type: 'updateInputPopoverState', payload: { show: undefined } });

        const selected = items.find((item) => item.checked === 'on');

        if (selected) {
          dispatch({
            type: 'updateInputTextEnteredState',
            payload: {
              leftOfCursorText: selected.label,
              rightOfCursorText: '',
            },
          });
        }

        dispatch({ type: 'addFocusToKeyCapture' });
      },
      [dispatch]
    );

    return (
      <div data-test-subj={getTestId()}>
        <EuiSelectable
          options={selectorOptions}
          onChange={handleSelectableOnChange}
          renderOption={handleRenderOption}
          searchable={true}
          searchableProps={searchBarProps}
          listProps={selectableListProps}
        >
          {(list, search) => {
            return (
              <>
                {list}
                <EuiSpacer size="s" />
                {search}
              </>
            );
          }}
        </EuiSelectable>
      </div>
    );
  }
);

CommandSelector.displayName = 'CommandSelector';
