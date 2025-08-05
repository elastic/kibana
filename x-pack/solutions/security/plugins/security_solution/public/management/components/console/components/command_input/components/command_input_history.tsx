/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EuiSelectableOption, EuiSelectableProps } from '@elastic/eui';
import { EuiSelectable, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { InputHistoryItem } from '../../console_state/types';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import { useWithInputTextEntered } from '../../../hooks/state_selectors/use_with_input_text_entered';
import { UserCommandInput } from '../../user_command_input';
import { useConsoleStateDispatch } from '../../../hooks/state_selectors/use_console_state_dispatch';
import { useWithInputHistory } from '../../../hooks/state_selectors/use_with_input_history';
import type { CommandDefinition } from '../../../types';
import { useDataTestSubj } from '../../../hooks/state_selectors/use_data_test_subj';
import { CommandInputClearHistory } from './command_input_clear_history';
import { useConsoleStore } from '../../console_state/console_state';

export const NO_HISTORY_EMPTY_MESSAGE = i18n.translate(
  'xpack.securitySolution.commandInputHistory.noHistoryEmptyMessage',
  { defaultMessage: 'No commands have been entered' }
);
const FILTER_HISTORY_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.commandInputHistory.filterPlaceholder',
  {
    defaultMessage: 'Filter previously entered actions',
  }
);
const NO_FILTERED_MATCHES = i18n.translate(
  'xpack.securitySolution.commandInputHistory.noFilteredMatchesFoundMessage',
  { defaultMessage: 'No entries found matching the filter entered' }
);

export const CommandInputHistory = memo(() => {
  const getTestId = useTestIdGenerator(useDataTestSubj());
  const dispatch = useConsoleStateDispatch();
  const inputHistory = useWithInputHistory();
  const { state: consoleState } = useConsoleStore();
  const [priorInputState] = useState(useWithInputTextEntered());
  const optionWasSelected = useRef(false);

  const selectableHistoryOptions = useMemo(() => {
    return inputHistory.map<EuiSelectableProps['options'][number]>((inputItem, index) => {
      return {
        label: inputItem.display,
        key: inputItem.id,
        data: inputItem,
      };
    });
  }, [inputHistory]);

  const selectableListProps: EuiSelectableProps['listProps'] = useMemo(() => {
    return {
      showIcons: false,
      bordered: true,
    };
  }, []);

  const selectableSearchProps = useMemo(() => {
    return {
      placeholder: FILTER_HISTORY_PLACEHOLDER,
      compressed: true,
      fullWidth: true,
    };
  }, []);

  const renderSelectionContent = useCallback<NonNullable<EuiSelectableProps['children']>>(
    (list, search) => {
      return (
        <>
          {list}
          <EuiSpacer size="s" />
          {/*
            The empty DIV below helps with a strange behaviour around losing the focus from inside the
            popover's Portal. Normally, the `search` input will force the focus to behave as expected, but
            if no input history exists, we don't want to show the search bar. In that case, we insert this
            div with `tabindex` which seems to get around the issue.
          */}
          {inputHistory.length > 0 ? search : <div tabIndex={-1} />}
        </>
      );
    },
    [inputHistory.length]
  );

  const handleSelectableOnChange: EuiSelectableProps['onChange'] = useCallback(
    (items: EuiSelectableOption[]) => {
      optionWasSelected.current = true;

      const selected = items.find((item) => item.checked === 'on');

      dispatch({ type: 'updateInputPopoverState', payload: { show: undefined } });
      dispatch({ type: 'updateInputPlaceholderState', payload: { placeholder: '' } });

      if (selected) {
        const historyItem = selected.data as InputHistoryItem;
        const originalArgState = historyItem.argState;

        // Clean file selector values from history argState
        // File selectors (selectorShowTextValue !== true) should not populate from history
        const cleanedArgState: typeof originalArgState = {};

        if (originalArgState) {
          // Get command definitions to check selectorShowTextValue
          const commandName = historyItem.input.split(' ')[0];
          const commandDef = consoleState.commands.find(
            (def: CommandDefinition) => def.name === commandName
          );

          for (const [argName, argValues] of Object.entries(originalArgState)) {
            const argDef = commandDef?.args?.[argName];

            if (argDef?.SelectorComponent && argDef.selectorShowTextValue !== true) {
              // File selectors: Clear values (set to empty)
              cleanedArgState[argName] = [];
            } else {
              // Script selectors: Keep original values
              cleanedArgState[argName] = argValues;
            }
          }
        }

        dispatch({
          type: 'updateInputTextEnteredState',
          payload: {
            leftOfCursorText: historyItem.input,
            rightOfCursorText: '',
            argState: cleanedArgState,
          },
        });
      }

      dispatch({ type: 'addFocusToKeyCapture' });
    },
    [consoleState.commands, dispatch]
  );

  const handleOnActiveOptionChange = useCallback<
    NonNullable<EuiSelectableProps['onActiveOptionChange']>
  >(
    (option) => {
      if (option) {
        dispatch({
          type: 'updateInputPlaceholderState',
          payload: {
            placeholder: (option.data as InputHistoryItem).input,
          },
        });
      }
    },
    [dispatch]
  );

  const handleRenderOption = useCallback<NonNullable<EuiSelectableProps['renderOption']>>(
    (option) => {
      return <UserCommandInput input={option.label} />;
    },
    []
  );

  // When first loaded, clear out the current text entered, and when this component
  // unloads, if no option from the history was selected, then set the prior text
  // entered back
  useEffect(() => {
    dispatch({
      type: 'updateInputTextEnteredState',
      payload: { leftOfCursorText: '', rightOfCursorText: '' },
    });

    return () => {
      if (!optionWasSelected.current) {
        dispatch({
          type: 'updateInputTextEnteredState',
          payload: {
            leftOfCursorText: priorInputState.leftOfCursorText,
            rightOfCursorText: priorInputState.rightOfCursorText,
          },
        });
        dispatch({ type: 'updateInputPlaceholderState', payload: { placeholder: '' } });
      }
    };
  }, [dispatch, optionWasSelected, priorInputState]);

  return (
    <div>
      {inputHistory.length > 0 && <CommandInputClearHistory />}

      <EuiSelectable
        options={selectableHistoryOptions}
        onChange={handleSelectableOnChange}
        onActiveOptionChange={handleOnActiveOptionChange}
        renderOption={handleRenderOption}
        listProps={selectableListProps}
        singleSelection={true}
        searchable={true}
        searchProps={selectableSearchProps}
        emptyMessage={NO_HISTORY_EMPTY_MESSAGE}
        noMatchesMessage={NO_FILTERED_MATCHES}
        data-test-subj={getTestId('inputHistorySelector')}
        data-console-input-history={true}
      >
        {renderSelectionContent}
      </EuiSelectable>
    </div>
  );
});
CommandInputHistory.displayName = 'CommandInputHistory';
