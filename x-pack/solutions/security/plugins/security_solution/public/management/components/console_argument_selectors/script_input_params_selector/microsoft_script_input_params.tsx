/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { TextareaInputArgumentProps } from '../textarea_input_argument';
import { TextareaInputArgument } from '../textarea_input_argument';

export const MicrosoftScriptInputParams = memo<TextareaInputArgumentProps>((props) => {
  const customizedProps: Pick<
    TextareaInputArgumentProps,
    | 'helpContent'
    | 'openLabel'
    | 'noInputEnteredMessage'
    | 'textareaLabel'
    | 'textareaPlaceholderLabel'
  > = useMemo(() => {
    return {};
  }, []);

  return <TextareaInputArgument {...props} {...customizedProps} />;
});
MicrosoftScriptInputParams.displayName = 'MicrosoftScriptInputParams';
