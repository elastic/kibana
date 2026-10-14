/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { Fragment } from 'react';

import { useValues } from 'kea';

import { EuiSpacer } from '@elastic/eui';

import {
  KbnDangerCallout,
  KbnInfoCallout,
  KbnSuccessCallout,
  KbnWarningCallout,
} from '@kbn/ui-callout';

import { FlashMessagesLogic } from './flash_messages_logic';

const flashMessageCalloutComponents = {
  success: KbnSuccessCallout,
  info: KbnInfoCallout,
  warning: KbnWarningCallout,
  error: KbnDangerCallout,
} as const;

export const FlashMessages: FC<PropsWithChildren<unknown>> = ({ children }) => {
  const { messages } = useValues(FlashMessagesLogic);

  return (
    <div aria-live="polite" data-test-subj="FlashMessages">
      {messages.map(({ type, message, description }, index) => {
        const CalloutComponent = flashMessageCalloutComponents[type];
        return (
          <Fragment key={index}>
            <CalloutComponent data-test-subj="flashMessageCallout" title={message}>
              {description}
            </CalloutComponent>
            <EuiSpacer />
          </Fragment>
        );
      })}
      {children}
    </div>
  );
};
