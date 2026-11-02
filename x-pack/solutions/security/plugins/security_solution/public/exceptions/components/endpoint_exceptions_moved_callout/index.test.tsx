/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders, createSecuritySolutionStorageMock } from '../../../common/mock';
import { createStartServicesMock } from '../../../common/lib/kibana/kibana_react.mock';

import { EndpointExceptionsMovedCallout } from '.';
import userEvent from '@testing-library/user-event';

describe('EndpointExceptionsMovedCalloutContainer', () => {
  it('should render the callout', () => {
    const { getByTestId } = render(
      <TestProviders>
        <EndpointExceptionsMovedCallout dismissable={false} id="testId" title="moved" />
      </TestProviders>
    );
    expect(getByTestId('EndpointExceptionsMovedCallout')).toHaveTextContent(
      'Endpoint exceptions are now managed from the Artifacts page'
    );
  });

  describe('title prop', () => {
    it('should render the "moved" title', () => {
      const { getByTestId } = render(
        <TestProviders>
          <EndpointExceptionsMovedCallout dismissable={false} id="testId" title="moved" />
        </TestProviders>
      );
      expect(getByTestId('EndpointExceptionsMovedCallout')).toHaveTextContent(
        'Endpoint exceptions have moved.'
      );
    });

    it('should render the "noLongerEvaluatedOnRules" title', () => {
      const { getByTestId } = render(
        <TestProviders>
          <EndpointExceptionsMovedCallout
            dismissable={false}
            id="testId"
            title="noLongerEvaluatedOnRules"
          />
        </TestProviders>
      );
      expect(getByTestId('EndpointExceptionsMovedCallout')).toHaveTextContent(
        'Endpoint exceptions are no longer evaluated during detection rule execution.'
      );
    });

    it('should render the "cannotBeAddedToRules" title', () => {
      const { getByTestId } = render(
        <TestProviders>
          <EndpointExceptionsMovedCallout
            dismissable={false}
            id="testId"
            title="cannotBeAddedToRules"
          />
        </TestProviders>
      );
      expect(getByTestId('EndpointExceptionsMovedCallout')).toHaveTextContent(
        'Endpoint Exceptions can no longer be added to detection rules.'
      );
    });
  });

  describe('dismissable prop', () => {
    it('should not render dismiss button when dismissable=false', () => {
      const { queryByTestId } = render(
        <TestProviders>
          <EndpointExceptionsMovedCallout dismissable={false} id="testId" title="moved" />
        </TestProviders>
      );
      expect(queryByTestId('euiDismissCalloutButton')).not.toBeInTheDocument();
    });

    it('should render dismiss button when dismissable=true', () => {
      const { getByTestId } = render(
        <TestProviders>
          <EndpointExceptionsMovedCallout dismissable={true} id="testId" title="moved" />
        </TestProviders>
      );
      expect(getByTestId('euiDismissCalloutButton')).toBeInTheDocument();
    });
  });

  describe('saving dismiss', () => {
    const { storage: storageMock } = createSecuritySolutionStorageMock();
    const startServices = { ...createStartServicesMock(), storage: storageMock };

    afterEach(() => {
      storageMock.clear();
    });

    it('should not display the callout again when dismissed with the same id', async () => {
      const { getByTestId, unmount } = render(
        <TestProviders startServices={startServices}>
          <EndpointExceptionsMovedCallout dismissable={true} id="testId" title="moved" />
        </TestProviders>
      );
      await userEvent.click(getByTestId('euiDismissCalloutButton'));
      unmount();

      const { queryByTestId } = render(
        <TestProviders startServices={startServices}>
          <EndpointExceptionsMovedCallout dismissable={true} id="testId" title="moved" />
        </TestProviders>
      );
      expect(queryByTestId('EndpointExceptionsMovedCallout')).not.toBeInTheDocument();
    });

    it('should still display a callout with a different id after another one is dismissed', async () => {
      const { getByTestId, unmount } = render(
        <TestProviders startServices={startServices}>
          <EndpointExceptionsMovedCallout dismissable={true} id="testId1" title="moved" />
        </TestProviders>
      );
      await userEvent.click(getByTestId('euiDismissCalloutButton'));
      unmount();

      const { getByTestId: getByTestId2 } = render(
        <TestProviders startServices={startServices}>
          <EndpointExceptionsMovedCallout dismissable={true} id="testId2" title="moved" />
        </TestProviders>
      );
      expect(getByTestId2('EndpointExceptionsMovedCallout')).toBeInTheDocument();
    });
  });
});
