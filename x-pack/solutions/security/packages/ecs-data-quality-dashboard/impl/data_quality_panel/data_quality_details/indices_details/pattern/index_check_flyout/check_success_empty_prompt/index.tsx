/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, memo } from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';

import { EmptyPromptBody } from '../empty_prompt_body';
import { EmptyPromptTitle } from '../empty_prompt_title';
import { INCOMPATIBLE_EMPTY, INCOMPATIBLE_EMPTY_TITLE } from './translations';

const CheckSuccessEmptyPromptComponent = () => {
  const body = useMemo(() => <EmptyPromptBody body={INCOMPATIBLE_EMPTY} />, []);
  const title = useMemo(() => <EmptyPromptTitle title={INCOMPATIBLE_EMPTY_TITLE} />, []);

  return (
    <EuiEmptyPrompt
      data-test-subj="checkSuccessEmptyPrompt"
      body={body}
      iconType="check"
      iconColor="success"
      title={title}
      titleSize="s"
    />
  );
};

CheckSuccessEmptyPromptComponent.displayName = 'CheckSuccessEmptyPromptComponent';

export const CheckSuccessEmptyPrompt = memo(CheckSuccessEmptyPromptComponent);
