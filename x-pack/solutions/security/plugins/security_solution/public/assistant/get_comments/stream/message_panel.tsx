/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { FailedToLoadResponse } from './failed_to_load_response';

interface Props {
  error?: Error;
  body?: React.ReactNode;
  controls?: React.ReactNode;
}

export function MessagePanel(props: Props) {
  return (
    <>
      {props.body}
      {props.error ? (
        <span data-test-subj="message-error">
          {props.body ? <EuiSpacer size="xs" /> : null}
          <FailedToLoadResponse />
        </span>
      ) : null}
      {props.controls ? (
        <>
          <EuiSpacer size="m" />
          <EuiHorizontalRule margin="none" />
          <EuiSpacer size="s" />
          {props.controls}
        </>
      ) : null}
    </>
  );
}
