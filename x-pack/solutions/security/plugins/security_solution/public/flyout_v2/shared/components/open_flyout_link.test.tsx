/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { OpenFlyoutLink } from './open_flyout_link';
import { OPEN_FLYOUT_LINK_TEST_ID } from './test_ids';
import { buildFlyoutContent, buildFlyoutDescriptorFromField } from '../utils/build_flyout_content';
import { buildFlyoutNavTitle } from '../utils/build_flyout_nav_title';
import { FlyoutSessionContextProvider } from '../../session_context';
import { FLYOUT_DESCRIPTOR_KIND } from '../url_state/flyout_v2_url_param';

jest.mock('../utils/build_flyout_content');
jest.mock('../utils/build_flyout_nav_title', () => ({
  buildFlyoutNavTitle: jest.fn((title: string) => `NAV:${title}`),
}));
jest.mock('./flyout_provider', () => ({
  flyoutProviders: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('../hooks/use_default_flyout_properties', () => ({
  useDefaultDocumentFlyoutProperties: () => ({ outsideClickCloses: true }),
}));

const mockWriteOnOpen = jest.fn();
const mockBuildOnClose = jest.fn(() => jest.fn());
jest.mock('../url_state/flyout_v2_url_writer', () => ({
  useFlyoutV2UrlWriter: jest.fn(() => ({
    writeOnOpen: mockWriteOnOpen,
    buildOnClose: mockBuildOnClose,
  })),
}));

const mockOpenSystemFlyout = jest.fn();
jest.mock('../../../common/lib/kibana', () => {
  const kibanaActual = jest.requireActual('../../../common/lib/kibana');
  return {
    ...kibanaActual,
    useKibana: () => ({
      ...kibanaActual.useKibana(),
      services: {
        ...kibanaActual.useKibana().services,
        overlays: {
          ...kibanaActual.useKibana().services.overlays,
          openSystemFlyout: mockOpenSystemFlyout,
        },
      },
    }),
  };
});

const buildFlyoutContentMock = buildFlyoutContent as jest.Mock;
const buildFlyoutDescriptorFromFieldMock = buildFlyoutDescriptorFromField as jest.Mock;
const buildFlyoutNavTitleMock = buildFlyoutNavTitle as jest.Mock;

const renderOpenFlyoutLink = (props: Partial<React.ComponentProps<typeof OpenFlyoutLink>> = {}) =>
  render(
    <TestProviders>
      <OpenFlyoutLink field="source.ip" value="10.0.0.1" {...props}>
        <span data-test-subj="fallbackChild">{'fallback'}</span>
      </OpenFlyoutLink>
    </TestProviders>
  );

describe('<OpenFlyoutLink />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOpenSystemFlyout.mockReturnValue({ onClose: Promise.resolve(), close: jest.fn() });
    mockBuildOnClose.mockReturnValue(jest.fn());
  });

  describe('when the field is supported', () => {
    const mockDescriptor = {
      kind: FLYOUT_DESCRIPTOR_KIND.network,
      ip: '10.0.0.1',
      flowTarget: 'source',
    };

    beforeEach(() => {
      buildFlyoutContentMock.mockReturnValue(<div data-test-subj="mockFlyoutContent" />);
      buildFlyoutDescriptorFromFieldMock.mockReturnValue(mockDescriptor);
    });

    it('should render a link with the value as text when no children are provided', () => {
      const { getByTestId } = render(
        <TestProviders>
          <OpenFlyoutLink field="source.ip" value="10.0.0.1" />
        </TestProviders>
      );

      const link = getByTestId(OPEN_FLYOUT_LINK_TEST_ID);
      expect(link).toBeInTheDocument();
      expect(link).toHaveTextContent('10.0.0.1');
    });

    it('should render children inside the link when children are provided', () => {
      const { getByTestId } = renderOpenFlyoutLink();

      const link = getByTestId(OPEN_FLYOUT_LINK_TEST_ID);
      expect(link).toBeInTheDocument();
      expect(link).toHaveTextContent('fallback');
    });

    it('should call openSystemFlyout when clicked', () => {
      const { getByTestId } = renderOpenFlyoutLink();

      getByTestId(OPEN_FLYOUT_LINK_TEST_ID).click();
      expect(mockOpenSystemFlyout).toHaveBeenCalled();
    });

    it('should follow the default session context when no override is provided', () => {
      const { getByTestId } = renderOpenFlyoutLink();

      getByTestId(OPEN_FLYOUT_LINK_TEST_ID).click();
      expect(mockOpenSystemFlyout).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ session: 'start', outsideClickCloses: true })
      );
    });

    it('should open as standalone flyout when asParent is true', () => {
      const { getByTestId } = renderOpenFlyoutLink({ asParent: true });

      getByTestId(OPEN_FLYOUT_LINK_TEST_ID).click();
      expect(mockOpenSystemFlyout).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ session: 'start', outsideClickCloses: true })
      );
    });

    it('should use a custom data-test-subj when provided', () => {
      const { getByTestId } = renderOpenFlyoutLink({ 'data-test-subj': 'customTestId' });

      expect(getByTestId('customTestId')).toBeInTheDocument();
    });

    it('should derive the history title from displayValue instead of value when provided', () => {
      const { getByTestId } = renderOpenFlyoutLink({ displayValue: 'my-alias' });

      getByTestId(OPEN_FLYOUT_LINK_TEST_ID).click();
      expect(mockOpenSystemFlyout).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ title: expect.stringContaining('my-alias') })
      );
    });

    it('should NOT compose via buildFlyoutNavTitle when the resolved session is "start"', () => {
      // Regression: when inside a session:'start' flyout (e.g. alert doc), a link that also
      // resolves to session:'start' must not prefix the parent session title onto the new root.
      const { getByTestId } = render(
        <TestProviders>
          <FlyoutSessionContextProvider value={{ session: 'start' }}>
            <OpenFlyoutLink field="source.ip" value="10.0.0.1" />
          </FlyoutSessionContextProvider>
        </TestProviders>
      );

      getByTestId(OPEN_FLYOUT_LINK_TEST_ID).click();
      expect(buildFlyoutNavTitleMock).not.toHaveBeenCalled();
      expect(mockOpenSystemFlyout).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ session: 'start' })
      );
      // Title must not be prefixed with a parent session title
      const title: string = mockOpenSystemFlyout.mock.calls[0][1].title;
      expect(title).not.toMatch(/^NAV:/);
    });

    it('should compose via buildFlyoutNavTitle when the resolved session is "inherit"', () => {
      const { getByTestId } = render(
        <TestProviders>
          <FlyoutSessionContextProvider value={{ session: 'inherit' }}>
            <OpenFlyoutLink field="source.ip" value="10.0.0.1" />
          </FlyoutSessionContextProvider>
        </TestProviders>
      );

      getByTestId(OPEN_FLYOUT_LINK_TEST_ID).click();
      expect(buildFlyoutNavTitleMock).toHaveBeenCalled();
      expect(mockOpenSystemFlyout.mock.calls[0][1].title).toMatch(/^NAV:/);
    });

    it('calls writeOnOpen with the descriptor on click', () => {
      const { getByTestId } = renderOpenFlyoutLink();

      getByTestId(OPEN_FLYOUT_LINK_TEST_ID).click();
      expect(mockWriteOnOpen).toHaveBeenCalledWith(mockDescriptor, 'start');
    });

    it('calls writeOnOpen with mode "inherit" when session is "inherit"', () => {
      const { getByTestId } = render(
        <TestProviders>
          <FlyoutSessionContextProvider value={{ session: 'inherit' }}>
            <OpenFlyoutLink field="source.ip" value="10.0.0.1" />
          </FlyoutSessionContextProvider>
        </TestProviders>
      );

      getByTestId(OPEN_FLYOUT_LINK_TEST_ID).click();
      expect(mockWriteOnOpen).toHaveBeenCalledWith(mockDescriptor, 'inherit');
    });

    it('passes an onClose callback to openSystemFlyout when descriptor is present', () => {
      const { getByTestId } = renderOpenFlyoutLink();

      getByTestId(OPEN_FLYOUT_LINK_TEST_ID).click();
      expect(mockBuildOnClose).toHaveBeenCalledWith(null);
      expect(mockOpenSystemFlyout.mock.calls[0][1].onClose).toBeDefined();
    });
  });

  describe('when the field is not supported', () => {
    beforeEach(() => {
      buildFlyoutContentMock.mockReturnValue(null);
      buildFlyoutDescriptorFromFieldMock.mockReturnValue(null);
    });

    it('should render children as fallback', () => {
      const { getByTestId, queryByTestId } = renderOpenFlyoutLink();

      expect(getByTestId('fallbackChild')).toBeInTheDocument();
      expect(queryByTestId(OPEN_FLYOUT_LINK_TEST_ID)).not.toBeInTheDocument();
    });

    it('should not call openSystemFlyout', () => {
      renderOpenFlyoutLink();

      expect(mockOpenSystemFlyout).not.toHaveBeenCalled();
    });
  });
});
