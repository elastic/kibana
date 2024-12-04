/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { TruncatedEnginesList } from '.';

describe('TruncatedEnginesList', () => {
  it('renders a list of engines with links to their schema pages', () => {
    const wrapper = shallow(<TruncatedEnginesList engines={['engine1', 'engine2', 'engine3']} />);

    expect(wrapper.find('[data-test-subj="displayedEngine"]')).toHaveLength(3);
    expect(wrapper.find('[data-test-subj="displayedEngine"]').first().prop('to')).toEqual(
      '/engines/engine1/schema'
    );
  });

  it('renders a tooltip when the number of engines is greater than the cutoff', () => {
    const wrapper = shallow(
      <TruncatedEnginesList engines={['engine1', 'engine2', 'engine3']} cutoff={1} />
    );

    expect(wrapper.find('[data-test-subj="displayedEngine"]')).toHaveLength(1);
    expect(wrapper.find('[data-test-subj="hiddenEnginesTooltip"]')).toHaveLength(1);
    expect(wrapper.find('[data-test-subj="hiddenEnginesTooltip"]').prop('content')).toEqual(
      'engine2, engine3'
    );
  });

  it('does not render if no engines are passed', () => {
    const wrapper = shallow(<TruncatedEnginesList engines={[]} />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });
});
