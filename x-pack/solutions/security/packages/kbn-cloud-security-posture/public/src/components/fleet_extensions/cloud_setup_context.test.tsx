/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';
import { render, screen } from '@testing-library/react';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import { coreMock } from '@kbn/core/public/mocks';
import { CloudSetupContext, CloudSetupProvider } from './cloud_setup_context';
import { getMockPackageInfo, getMockPolicyAWS, mockConfig } from './test/mock';
import type { NewPackagePolicy, PackageInfo } from '@kbn/fleet-plugin/common';

const mockCore = coreMock.createStart();
const mockCloud = cloudMock.createSetup();

const packageInfo = getMockPackageInfo() as PackageInfo;
const packagePolicy = getMockPolicyAWS() as NewPackagePolicy;

const TestComponent = () => {
  const context = useContext(CloudSetupContext);
  if (!context) return <div>{'No context'}</div>;
  return (
    <div>
      <span data-test-subj="integration-name">{context.config.name}</span>
      <span data-test-subj="default-provider">{context.config.defaultProvider}</span>
    </div>
  );
};

const mockProviderProps = {
  config: mockConfig,
  uiSettings: mockCore.uiSettings,
  cloud: mockCloud,
  packageInfo,
  packagePolicy,
};

describe('CloudSetupContext', () => {
  it('provides the config to children via context', async () => {
    render(
      <CloudSetupProvider {...mockProviderProps}>
        <TestComponent />
      </CloudSetupProvider>
    );
    expect(screen.getByTestId('integration-name')).toHaveTextContent('Test Integration');
    expect(screen.getByTestId('default-provider')).toHaveTextContent('aws');
  });

  it('returns undefined if used outside the provider', () => {
    render(<TestComponent />);
    expect(screen.getByText('No context')).toBeInTheDocument();
  });
});
