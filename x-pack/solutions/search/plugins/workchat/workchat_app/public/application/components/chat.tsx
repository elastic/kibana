/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import { useChat } from '../hooks/use_chat';

export const Chat: React.FC<{}> = () => {
  const { send } = useChat();

  const onClick = useCallback(() => {
    send('test');
  }, [send]);

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <EuiButton onClick={onClick}>Click to test</EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
