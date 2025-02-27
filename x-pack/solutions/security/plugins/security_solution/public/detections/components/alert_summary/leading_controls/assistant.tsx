/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiButtonIcon } from '@elastic/eui';
import assistantIcon from '@kbn/ai-assistant-icon/svg/assistant';

/**
 *
 */
export const AssistantRowControlColumn = memo(() => {
  const onClick = useCallback(() => window.alert('AssistantRowControlColumn'), []);
  return <EuiButtonIcon iconType={assistantIcon} onClick={onClick} />;
});

AssistantRowControlColumn.displayName = 'AssistantRowControlColumn';
