/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import type { TriggersAndActionsUIPublicPluginStart as TriggersActionsStart } from '@kbn/triggers-actions-ui-plugin/public';

const styles = { display: 'inline' };
/**
 * Returns a default object to mock the triggers actions ui plugin for our unit tests and storybook stories.
 */
export const mockTriggersActionsUiService: TriggersActionsStart = {
  getFieldBrowser: () => (
    <EuiText css={styles} size="xs">
      {'Fields'}
    </EuiText>
  ),
} as unknown as TriggersActionsStart;
