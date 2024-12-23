/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { StoryFn } from '@storybook/react';
import { EuiContextMenuPanel } from '@elastic/eui';
import {
  CopyToClipboardButtonEmpty,
  CopyToClipboardButtonIcon,
  CopyToClipboardContextMenu,
} from './copy_to_clipboard';

export default {
  title: 'CopyToClipboard',
};

const mockValue: string = 'Text copied!';

export const ButtonEmpty: StoryFn<void> = () => {
  return <CopyToClipboardButtonEmpty value={mockValue} />;
};

export const ContextMenu: StoryFn<void> = () => {
  const items = [<CopyToClipboardContextMenu value={mockValue} />];

  return <EuiContextMenuPanel items={items} />;
};

export const ButtonIcon: StoryFn<void> = () => {
  return <CopyToClipboardButtonIcon value={mockValue} />;
};
