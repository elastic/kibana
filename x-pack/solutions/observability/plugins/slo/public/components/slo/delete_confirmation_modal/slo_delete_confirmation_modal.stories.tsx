/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ComponentStory } from '@storybook/react';
import React from 'react';
import { KibanaReactStorybookDecorator } from '../../../utils/kibana_react.storybook_decorator';
import { buildSlo } from '../../../data/slo/slo';
import { Props, SloDeleteModal as Component } from './slo_delete_confirmation_modal';

export default {
  component: Component,
  title: 'app/SLO/ListPage/SloDeleteConfirmationModal',
  decorators: [KibanaReactStorybookDecorator],
};

const Template: ComponentStory<typeof Component> = (props: Props) => <Component {...props} />;

const defaultProps = {
  slo: buildSlo(),
};

export const SloDeleteConfirmationModal = Template.bind({});
SloDeleteConfirmationModal.args = defaultProps;
