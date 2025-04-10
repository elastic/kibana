/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { TestProviders } from '../../../../../../common/mock';
import { useMountAppended } from '../../../../../../common/utils/use_mount_appended';
import { Package } from './package';
import { CellActionsWrapper } from '../../../../../../common/components/drag_and_drop/cell_actions_wrapper';

jest.mock('../../../../../../common/lib/kibana');

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiScreenReaderOnly: () => <></>,
  };
});

jest.mock('../../../../../../common/components/drag_and_drop/cell_actions_wrapper', () => {
  return {
    CellActionsWrapper: jest.fn(),
  };
});

const MockedCellActionsWrapper = jest.fn(({ children }) => {
  return <div data-test-subj="mock-cell-action-wrapper">{children}</div>;
});

describe('Package', () => {
  beforeEach(() => {
    (CellActionsWrapper as unknown as jest.Mock).mockImplementation(MockedCellActionsWrapper);
  });
  const mount = useMountAppended();

  describe('rendering', () => {
    test('it renders against shallow snapshot', () => {
      const wrapper = shallow(
        <Package
          scopeId="some_scope"
          contextId="[context-123]"
          eventId="[event-123]"
          packageName="package-name-123"
          packageSummary="package-summary-123"
          packageVersion="package-version-123"
        />
      );
      expect(wrapper).toMatchSnapshot();
    });

    test('it returns null if all of the package information is null ', () => {
      const wrapper = shallow(
        <Package
          scopeId="some_scope"
          contextId="[context-123]"
          eventId="[event-123]"
          packageName={null}
          packageSummary={null}
          packageVersion={null}
        />
      );
      expect(wrapper.isEmptyRender()).toBeTruthy();
    });

    test('it returns null if all of the package information is undefined ', () => {
      const wrapper = shallow(
        <Package
          scopeId="some_scope"
          contextId="[context-123]"
          eventId="[event-123]"
          packageName={undefined}
          packageSummary={undefined}
          packageVersion={undefined}
        />
      );
      expect(wrapper.isEmptyRender()).toBeTruthy();
    });

    test('it returns just the package name', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <Package
              scopeId="some_scope"
              contextId="[context-123]"
              eventId="[event-123]"
              packageName="[package-name-123]"
              packageSummary={undefined}
              packageVersion={undefined}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('[package-name-123]');
    });

    test('it returns just the package name and package summary', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <Package
              scopeId="some_scope"
              contextId="[context-123]"
              eventId="[event-123]"
              packageName="[package-name-123]"
              packageSummary="[package-summary-123]"
              packageVersion={undefined}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('[package-name-123][package-summary-123]');
    });

    test('it returns just the package name, package summary, package version', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <Package
              scopeId="some_scope"
              contextId="[context-123]"
              eventId="[event-123]"
              packageName="[package-name-123]"
              packageSummary="[package-summary-123]"
              packageVersion="[package-version-123]"
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        '[package-name-123][package-version-123][package-summary-123]'
      );
    });

    test('should passing correct scopeId to cell actions', () => {
      mount(
        <TestProviders>
          <div>
            <Package
              scopeId="some_scope"
              contextId="[context-123]"
              eventId="[event-123]"
              packageName="[package-name-123]"
              packageSummary="[package-summary-123]"
              packageVersion="[package-version-123]"
            />
          </div>
        </TestProviders>
      );

      expect(MockedCellActionsWrapper).toHaveBeenCalledWith(
        expect.objectContaining({
          scopeId: 'some_scope',
        }),
        {}
      );
    });
  });
});
