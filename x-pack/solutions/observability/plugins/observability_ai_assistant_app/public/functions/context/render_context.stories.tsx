/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { ComponentMeta, ComponentStoryObj } from '@storybook/react';
import { ComponentProps } from 'react';
import type {
  ContextToolResponseV1,
  ContextToolResponseV2,
} from '@kbn/observability-ai-assistant-plugin/server';
import { RenderContext as Component } from './render_context';
import { v2Response } from './mock_story_data';

const meta: ComponentMeta<typeof Component> = {
  component: Component,
  title: 'app/Organisms/RenderContext',
};

export default meta;

const connectorIcons = new Map([['github', 'github']]);

const render = (props: ComponentProps<typeof Component>) => {
  return <Component {...props} connectorIcons={connectorIcons} />;
};

export const WithData: ComponentStoryObj<typeof Component> = {
  args: {
    response: v2Response,
  },
  render,
};

export const Empty: ComponentStoryObj<typeof Component> = {
  args: {
    response: {
      content: {
        screen_description: '',
        data_on_screen: [],
        entries: [],
      },
      data: {
        entries: [],
        queries: [],
      },
    } satisfies ContextToolResponseV2,
  },
  render,
};

export const EmptyVersion1: ComponentStoryObj<typeof Component> = {
  args: {
    response: {
      content: {
        learnings: [],
        screen_description: '',
        data_on_screen: [],
      },
      data: {
        scores: [],
        suggestions: [],
      },
    } satisfies ContextToolResponseV1,
  },
  render,
};
