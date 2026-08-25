/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { StoryFn, StoryObj } from '@storybook/react';
import type { DiffViewProps } from './diff_view';
import { DiffView } from './diff_view';
import { DiffMethod } from './mark_edits';

export default {
  component: DiffView,
  title: 'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/DiffView',
  argTypes: {
    oldSource: {
      control: 'text',
    },
    newSource: {
      control: 'text',
    },
    diffMethod: {
      control: 'select',
      options: [
        DiffMethod.WORDS_WITH_SPACE,
        DiffMethod.WORDS,
        DiffMethod.CHARS,
        DiffMethod.LINES,
        DiffMethod.SENTENCES,
      ],
      defaultValue: DiffMethod.WORDS_WITH_SPACE,
    },
    zip: {
      control: 'boolean',
      defaultValue: false,
    },
  },
};

const Template: StoryFn<DiffViewProps> = ({ oldSource, newSource, diffMethod, zip }) => {
  return (
    <DiffView
      oldSource={oldSource}
      newSource={newSource}
      diffMethod={diffMethod}
      zip={zip}
      viewType="unified"
    />
  );
};

export const Default: StoryObj<DiffViewProps> = {
  render: Template,

  args: {
    oldSource:
      'from logs-endpoint.alerts-*\n| where event.code in ("malicious_file", "memory_signature", "shellcode_thread") and rule.name is not null\n| keep host.id, rule.name, event.code\n| stats hosts = count_distinct(host.id) by rule.name, event.code\n| where hosts >= 3',
    newSource:
      'from logs-endpoint.alerts-*\n| where event.code in ("malicious_file", "memory_signature", "shellcode_thread")\n| stats hosts = count_distinct(host.id)\n| where hosts >= 3',
  },
};
