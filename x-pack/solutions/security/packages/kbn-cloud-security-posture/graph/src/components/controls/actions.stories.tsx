/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryFn, StoryObj } from '@storybook/react';
import { ThemeProvider, css } from '@emotion/react';
import { action } from '@storybook/addon-actions';
import { Actions as ActionsComponent, type ActionsProps } from './actions';

export default {
  title: 'Components/Graph Components/Additional Components',
  description: 'CDR - Graph visualization',
  argTypes: {
    searchWarningMessage: {
      control: 'object',
    },
  },
} as Meta;

const Template: StoryFn<ActionsProps> = (props) => {
  return (
    <ThemeProvider theme={{ darkMode: false }}>
      <ActionsComponent
        css={css`
          width: 42px;
        `}
        onInvestigateInTimeline={action('investigateInTimeline')}
        onSearchToggle={action('searchToggle')}
        {...props}
      />
    </ThemeProvider>
  );
};

export const Actions: StoryObj<ActionsProps> = {
  render: Template,

  args: {
    showToggleSearch: true,
    searchFilterCounter: 0,
    showInvestigateInTimeline: true,
    searchToggled: false,
  },
};
