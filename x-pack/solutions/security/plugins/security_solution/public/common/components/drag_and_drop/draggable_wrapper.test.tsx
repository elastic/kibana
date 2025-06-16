/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import { shallow } from 'enzyme';
import React from 'react';
import type { DraggableStateSnapshot, DraggingStyle } from '@hello-pangea/dnd';

import { mockBrowserFields } from '../../containers/source/mock';
import { TestProviders } from '../../mock';
import { mockDataProviders } from '../../../timelines/components/timeline/data_providers/mock/mock_data_providers';
import { ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID } from '../../../timelines/components/row_renderers_browser/constants';
import { DragDropContextWrapper } from './drag_drop_context_wrapper';
import { disableHoverActions, DraggableWrapper, getStyle } from './draggable_wrapper';
import { useMountAppended } from '../../utils/use_mount_appended';
import { TimelineId } from '../../../../common/types';
import { TableId } from '@kbn/securitysolution-data-table';

jest.mock('../../lib/kibana');

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiScreenReaderOnly: () => <></>,
  };
});

const MockSecurityCellActions = jest.fn(({ children }: { children: React.ReactNode }) => (
  <div data-test-subj="cell-actions-mock">{children}</div>
));
jest.mock('../cell_actions', () => ({
  ...jest.requireActual('../cell_actions'),
  SecurityCellActions: (props: { children: React.ReactNode }) => MockSecurityCellActions(props),
}));

const scopeIdsWithHoverActions = [
  undefined,
  TimelineId.active,
  TableId.alternateTest,
  TimelineId.casePage,
  TableId.alertsOnAlertsPage,
  TableId.alertsOnRuleDetailsPage,
  TableId.hostsPageEvents,
  TableId.hostsPageSessions,
  TableId.kubernetesPageSessions,
  TableId.networkPageEvents,
  TimelineId.test,
  TableId.usersPageEvents,
];

const scopeIdsNoHoverActions = [TableId.rulePreview, ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID];

describe('DraggableWrapper', () => {
  const dataProvider = mockDataProviders[0];
  const message = 'draggable wrapper content';
  const mount = useMountAppended();

  beforeEach(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  afterEach(() => {
    const portal = document.querySelector('[data-euiportal="true"]');
    if (portal != null) {
      portal.innerHTML = '';
    }
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('rendering', () => {
    test('it renders against the snapshot', () => {
      const wrapper = shallow(
        <TestProviders>
          <DragDropContextWrapper browserFields={mockBrowserFields}>
            <DraggableWrapper dataProvider={dataProvider} render={() => message} />
          </DragDropContextWrapper>
        </TestProviders>
      );

      expect(wrapper.find('DraggableWrapper')).toMatchSnapshot();
    });

    test('it renders the children passed to the render prop', () => {
      const wrapper = mount(
        <TestProviders>
          <DragDropContextWrapper browserFields={mockBrowserFields}>
            <DraggableWrapper dataProvider={dataProvider} render={() => message} />
          </DragDropContextWrapper>
        </TestProviders>
      );

      expect(wrapper.text()).toEqual(message);
    });

    scopeIdsWithHoverActions.forEach((scopeId) => {
      test(`it renders hover actions (by default) when 'isDraggable' is false and timelineId is '${scopeId}'`, async () => {
        const { queryByTestId } = render(
          <TestProviders>
            <DragDropContextWrapper browserFields={mockBrowserFields}>
              <DraggableWrapper
                dataProvider={dataProvider}
                render={() => message}
                scopeId={scopeId}
              />
            </DragDropContextWrapper>
          </TestProviders>
        );

        expect(queryByTestId('cell-actions-mock')).toBeInTheDocument();
      });
    });

    scopeIdsNoHoverActions.forEach((scopeId) => {
      test(`it does NOT render hover actions when 'isDraggable' is false and timelineId is '${scopeId}'`, async () => {
        const { queryByTestId } = render(
          <TestProviders>
            <DragDropContextWrapper browserFields={mockBrowserFields}>
              <DraggableWrapper
                dataProvider={dataProvider}
                render={() => message}
                scopeId={scopeId}
              />
            </DragDropContextWrapper>
          </TestProviders>
        );

        expect(queryByTestId('cell-actions-mock')).not.toBeInTheDocument();
      });
    });
  });

  describe('text truncation styling', () => {
    test('it applies text truncation styling when truncate IS specified (implicit: and the user is not dragging)', () => {
      const wrapper = mount(
        <TestProviders>
          <DragDropContextWrapper browserFields={mockBrowserFields}>
            <DraggableWrapper dataProvider={dataProvider} render={() => message} truncate />
          </DragDropContextWrapper>
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="render-truncatable-content"]').exists()).toEqual(true);
    });

    test('it does NOT apply text truncation styling when truncate is NOT specified', () => {
      const wrapper = mount(
        <TestProviders>
          <DragDropContextWrapper browserFields={mockBrowserFields}>
            <DraggableWrapper dataProvider={dataProvider} render={() => message} />
          </DragDropContextWrapper>
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="draggable-truncatable-content"]').exists()).toEqual(
        false
      );
    });
  });
});

describe('ConditionalPortal', () => {
  describe('getStyle', () => {
    const style: DraggingStyle = {
      boxSizing: 'border-box',
      height: 10,
      left: 1,
      pointerEvents: 'none',
      position: 'fixed',
      transition: 'none',
      top: 123,
      width: 50,
      zIndex: 9999,
    };

    it('returns a style with no transitionDuration when the snapshot is not drop animating', () => {
      const snapshot: DraggableStateSnapshot = {
        isDragging: true,
        isDropAnimating: false, // <-- NOT drop animating
        isClone: false,
        dropAnimation: null,
        draggingOver: null,
        combineWith: null,
        combineTargetFor: null,
        mode: null,
      };

      expect(getStyle(style, snapshot)).not.toHaveProperty('transitionDuration');
    });

    it('returns a style with a transitionDuration when the snapshot is drop animating', () => {
      const snapshot: DraggableStateSnapshot = {
        isDragging: true,
        isDropAnimating: true, // <-- it is drop animating
        isClone: false,
        dropAnimation: null,
        draggingOver: null,
        combineWith: null,
        combineTargetFor: null,
        mode: null,
      };

      expect(getStyle(style, snapshot)).toHaveProperty('transitionDuration', '0.00000001s');
    });
  });

  describe('disableHoverActions', () => {
    scopeIdsNoHoverActions.forEach((scopeId) =>
      test(`it returns true when timelineId is ${scopeId}`, () => {
        expect(disableHoverActions(scopeId)).toBe(true);
      })
    );

    scopeIdsWithHoverActions.forEach((scopeId) =>
      test(`it returns false when timelineId is ${scopeId}`, () => {
        expect(disableHoverActions(scopeId)).toBe(false);
      })
    );
  });
});
