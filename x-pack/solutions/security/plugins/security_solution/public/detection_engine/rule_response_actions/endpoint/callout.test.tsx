/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EndpointActionCallout } from './callout';
import { renderReactTestingLibraryWithI18n as render } from '@kbn/test-jest-helpers';
import { useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
jest.mock('@kbn/es-ui-shared-plugin/static/forms/hook_form_lib');

const useFormDataMock = useFormData as jest.MockedFunction<typeof useFormData>;

const mockFormData = (data: Record<string, string>) => {
  (useFormDataMock as jest.MockedFunction<typeof useFormData>).mockReturnValue([
    data,
    jest.fn(),
    false,
  ]);
};

describe('EndpointActionCallout', () => {
  describe('isolate', () => {
    beforeAll(() => {
      mockFormData({
        'test.command': 'isolate',
      });
    });
    it('renders insufficient privileges warning when editDisabled', () => {
      const { getByText } = render(<EndpointActionCallout basePath="test" editDisabled={true} />);
      expect(getByText('Insufficient privileges')).toBeInTheDocument();
    });

    it('renders isolation caution for isolate command', () => {
      const { queryByText, getByText } = render(
        <EndpointActionCallout basePath="test" editDisabled={false} />
      );
      expect(getByText('Proceed with caution')).toBeInTheDocument();
      expect(
        getByText(
          'Only select this option if you’re certain that you want to automatically block communication with other hosts on your network until you release this host.'
        )
      ).toBeInTheDocument();
      expect(
        queryByText(
          'Only select this option if you’re certain that you want to automatically terminate the process running on a host.'
        )
      ).not.toBeInTheDocument();
    });
  });

  describe('kill-process/suspend-process', () => {
    beforeAll(() => {
      mockFormData({
        'test.command': 'kill-process',
      });
    });
    it('renders process caution for kill-process/suspend-process commands', () => {
      const { queryByText, getByText } = render(
        <EndpointActionCallout basePath="test" editDisabled={false} />
      );
      expect(getByText('Proceed with caution')).toBeInTheDocument();
      expect(
        getByText(
          'Only select this option if you’re certain that you want to automatically terminate the process running on a host.'
        )
      ).toBeInTheDocument();
      expect(
        queryByText(
          'Only select this option if you’re certain that you want to automatically block communication with other hosts on your network until you release this host.'
        )
      ).not.toBeInTheDocument();
    });
  });
});
