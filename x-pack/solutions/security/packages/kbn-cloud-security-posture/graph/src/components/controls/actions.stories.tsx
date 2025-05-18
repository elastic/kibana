/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider, css } from '@emotion/react';
import { action } from '@storybook/addon-actions';
import { Actions as ActionsComponent, type ActionsProps } from './actions';
import { GlobalStylesStorybookDecorator } from '../../../.storybook/decorators';

export default {
  title: 'Components/Graph Components/Additional Components',
  render: (props) => {
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
  },
  argTypes: {
    searchWarningMessage: {
      control: 'object',
    },
  },
  decorators: [GlobalStylesStorybookDecorator],
} satisfies Meta<typeof ActionsComponent>;

export const Actions: StoryObj<ActionsProps> = {
  args: {
    showToggleSearch: true,
    searchFilterCounter: 0,
    showInvestigateInTimeline: true,
    searchToggled: false,
  },
};
