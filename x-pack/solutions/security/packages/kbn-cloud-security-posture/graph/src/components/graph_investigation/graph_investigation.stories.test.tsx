/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { setProjectAnnotations } from '@storybook/react';
import { composeStories } from '@storybook/testing-react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import * as stories from './graph_investigation.stories';
import { type GraphInvestigationProps } from './graph_investigation';
import { GRAPH_INVESTIGATION_TEST_ID, GRAPH_ACTIONS_INVESTIGATE_IN_TIMELINE_ID } from '../test_ids';
import * as previewAnnotations from '../../../.storybook/preview';

setProjectAnnotations(previewAnnotations);

const { Investigation } = composeStories(stories);

jest.mock('../../hooks/use_fetch_graph_data', () => {
  return require('../mock/use_fetch_graph_data.mock');
});

const renderStory = (args: Partial<GraphInvestigationProps> = {}) => {
  return render(
    <IntlProvider locale="en">
      <Investigation {...args} />
    </IntlProvider>
  );
};

// Turn off the optimization that hides elements that are not visible in the viewport
jest.mock('../graph/constants', () => ({
  ONLY_RENDER_VISIBLE_ELEMENTS: false,
}));

describe('GraphInvestigation Component', () => {
  it('renders without crashing', () => {
    const { getByTestId } = renderStory();

    expect(getByTestId(GRAPH_INVESTIGATION_TEST_ID)).toBeInTheDocument();
  });

  it('renders with initial state', () => {
    const { container, getAllByText } = renderStory();

    const nodes = container.querySelectorAll('.react-flow__nodes .react-flow__node');
    expect(nodes).toHaveLength(3);
    expect(getAllByText('~ an hour ago')).toHaveLength(2);
  });

  it('calls onInvestigateInTimeline action', () => {
    const onInvestigateInTimeline = jest.fn();
    const { getByTestId } = renderStory({
      onInvestigateInTimeline,
      showInvestigateInTimeline: true,
    });

    getByTestId(GRAPH_ACTIONS_INVESTIGATE_IN_TIMELINE_ID).click();

    expect(onInvestigateInTimeline).toHaveBeenCalled();
  });
});
