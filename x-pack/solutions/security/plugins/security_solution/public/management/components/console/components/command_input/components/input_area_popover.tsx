/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CSSProperties, ReactElement } from 'react';
import React, { memo, useCallback, useEffect, useMemo } from 'react';
import { EuiFocusTrap, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import { CommandInputHistory } from './command_input_history';
import { useConsoleStateDispatch } from '../../../hooks/state_selectors/use_console_state_dispatch';
import { useWithInputShowPopover } from '../../../hooks/state_selectors/use_with_input_show_popover';
import { useDataTestSubj } from '../../../hooks/state_selectors/use_data_test_subj';
import { CommandSelector } from './command_selector';

export interface InputAreaPopoverProps {
  /** Should be the Console's input area */
  children: ReactElement;
  /** Width should match that of the entire input area of the console */
  width?: string;
}

export const InputAreaPopover = memo<InputAreaPopoverProps>(({ children, width = '92vw' }) => {
  const getTestId = useTestIdGenerator(useDataTestSubj());
  const show = useWithInputShowPopover();
  const isPopoverOpen = show !== undefined;
  const dispatch = useConsoleStateDispatch();

  // ID should be passed down to whatever component is rendered in the popover, so that
  // `focus` can be applied to it after the popover is opened
  const initialFocusId = useMemo(() => {
    return `inputPopover_${Math.random().toString(36).substring(2, 15)}`;
  }, []);

  const popoverPanelStyles = useMemo<CSSProperties>(() => {
    return {
      width,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
    };
  }, [width]);

  const focusTrapProps = useMemo(() => {
    return {
      clickOutsideDisables: true,
    };
  }, []);

  const handlePopoverOnClose = useCallback(() => {
    dispatch({ type: 'updateInputPopoverState', payload: { show: undefined } });
    dispatch({ type: 'addFocusToKeyCapture' });
  }, [dispatch]);

  useEffect(() => {
    // Anytime the popover is closed, focus on Input area
    if (!show) {
      dispatch({ type: 'addFocusToKeyCapture' });
    }
  }, [dispatch, show]);

  return (
    <EuiPopover
      button={children}
      closePopover={handlePopoverOnClose}
      isOpen={isPopoverOpen}
      panelStyle={popoverPanelStyles}
      anchorPosition="upLeft"
      hasArrow={false}
      display="block"
      attachToAnchor={true}
      focusTrapProps={focusTrapProps}
      ownFocus={false}
      initialFocus={`#${initialFocusId}`}
      data-test-subj={getTestId('inputPopover')}
      aria-label={i18n.translate('xpack.securitySolution.console.inputAreaPopover.ariaLabel', {
        defaultMessage: 'Command input history',
      })}
    >
      {show && (
        <EuiFocusTrap clickOutsideDisables={true}>
          {show === 'input-history' && <CommandInputHistory initialFocusId={initialFocusId} />}

          {show === 'command-selector' && <CommandSelector initialFocusId={initialFocusId} />}
        </EuiFocusTrap>
      )}
    </EuiPopover>
  );
});
InputAreaPopover.displayName = 'InputAreaPopover';
