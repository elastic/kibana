/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexItem } from '@elastic/eui';
import { useChat } from '../hooks/use_chat';
import { ChatInputForm } from './chat_input_form';

export const Chat: React.FC<{}> = () => {
  const { send, events } = useChat();

  const onSubmit = useCallback(
    (message: string) => {
      send(message);
    },
    [send]
  );

  return (
    <>
      <EuiFlexItem grow css={{ overflow: 'auto' }}>
        <div>
          {events.map((event) => {
            return <div>{JSON.stringify(event)}</div>;
          })}
        </div>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <ChatInputForm disabled={false} loading={false} onSubmit={onSubmit} />
      </EuiFlexItem>
    </>
  );
};
