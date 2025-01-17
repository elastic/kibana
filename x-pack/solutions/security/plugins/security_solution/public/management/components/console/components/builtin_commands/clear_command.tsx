/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { memo, useEffect } from 'react';
import { useConsoleStateDispatch } from '../../hooks/state_selectors/use_console_state_dispatch';
import type { CommandExecutionComponentProps } from '../../types';

export const ClearCommand = memo<CommandExecutionComponentProps>(({ status, setStatus }) => {
  const dispatch = useConsoleStateDispatch();

  useEffect(() => {
    if (status === 'pending') {
      dispatch({ type: 'clear' });
    }
    setStatus('success');
  }, [status, setStatus, dispatch]);

  return null;
});
ClearCommand.displayName = 'ClearCommand';
