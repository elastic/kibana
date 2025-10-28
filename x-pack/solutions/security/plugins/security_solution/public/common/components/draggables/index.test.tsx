/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { EuiToolTip } from '@elastic/eui';
import { TestProviders } from '../../mock';
import { getEmptyString } from '../empty_value';
import { useMountAppended } from '../../utils/use_mount_appended';

import { DraggableBadge } from '.';

jest.mock('../../lib/kibana');

describe('draggables', () => {
  const mount = useMountAppended();

  describe('rendering', () => {
    test('it renders the default Badge', () => {
      const wrapper = shallow(
        <DraggableBadge
          contextId="context-id"
          eventId="event-id"
          field="some-field"
          value="some-value"
          queryValue="some-query-value"
          iconType="number"
        >
          <span>{'A child of this'}</span>
        </DraggableBadge>
      );
      expect(wrapper).toMatchSnapshot();
    });
  });

  describe('DraggableBadge', () => {
    test('it works with just an id, field, and value and is the default', () => {
      const wrapper = mount(
        <TestProviders>
          <DraggableBadge
            contextId="context-id"
            eventId="event-id"
            field="some-field"
            value="some value"
            iconType="number"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('some value');
    });

    test('it returns null if value is undefined', () => {
      const wrapper = shallow(
        <DraggableBadge
          contextId="context-id"
          eventId="event-id"
          field="some-field"
          iconType="number"
          value={undefined}
        />
      );
      expect(wrapper.isEmptyRender()).toBeTruthy();
    });

    test('it returns null if value is null', () => {
      const wrapper = shallow(
        <DraggableBadge
          contextId="context-id"
          eventId="event-id"
          field="some-field"
          value={null}
          iconType="number"
        />
      );
      expect(wrapper.isEmptyRender()).toBeTruthy();
    });

    test('it returns Empty string text if value is an empty string', () => {
      const wrapper = mount(
        <TestProviders>
          <DraggableBadge
            contextId="context-id"
            eventId="event-id"
            field="some-field"
            value=""
            iconType="document"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(getEmptyString());
    });

    test('it renders a tooltip with the field name if a tooltip is not explicitly provided', () => {
      const wrapper = mount(
        <TestProviders>
          <DraggableBadge
            contextId="context-id"
            eventId="event-id"
            field="some-field"
            value="some value"
            iconType="number"
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="some-field-tooltip"]').first().props().content).toEqual(
        'some-field'
      );
    });

    test('it renders the tooltipContent when a string is provided as content', () => {
      const wrapper = mount(
        <TestProviders>
          <DraggableBadge
            contextId="context-id"
            eventId="event-id"
            field="some-field"
            value="some value"
            iconType="number"
            tooltipContent="draggable badge string tooltip"
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="some-field-tooltip"]').first().props().content).toEqual(
        'draggable badge string tooltip'
      );
    });

    test('it renders the tooltipContent when an element is provided as content', () => {
      const wrapper = mount(
        <TestProviders>
          <DraggableBadge
            contextId="context-id"
            eventId="event-id"
            field="some-field"
            value="some value"
            iconType="number"
            tooltipContent={<span>{'draggable badge tooltip'}</span>}
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="some-field-tooltip"]').first().props().content).toEqual(
        <span>{'draggable badge tooltip'}</span>
      );
    });

    test('it does NOT render a tooltip when tooltipContent is null', () => {
      const wrapper = mount(
        <TestProviders>
          <DraggableBadge
            contextId="context-id"
            eventId="event-id"
            field="some-field"
            value="some value"
            iconType="number"
            tooltipContent={null}
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="some-field-tooltip"]').first().exists()).toBe(false);
    });

    test('it uses the specified tooltipPosition', () => {
      const wrapper = mount(
        <TestProviders>
          <DraggableBadge
            contextId="context-id"
            eventId="event-id"
            field="some-field"
            value="some value"
            tooltipPosition="top"
          />
        </TestProviders>
      );

      expect(wrapper.find(EuiToolTip).first().props().position).toEqual('top');
    });
  });
});
