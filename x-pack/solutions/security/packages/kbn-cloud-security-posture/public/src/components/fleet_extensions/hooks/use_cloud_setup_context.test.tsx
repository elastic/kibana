/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import React from 'react';
// import { renderHook } from '@testing-library/react';
// import { useCloudSetup } from './use_cloud_setup_context';
// import { CloudSetupContext } from '../cloud_setup_context';
// import { AWS_PROVIDER, GCP_PROVIDER, AZURE_PROVIDER } from '../constants';
// import { mockConfig } from '../test/mock';

// const wrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
//   <CloudSetupContext.Provider value={{ config: mockConfig }}>{children}</CloudSetupContext.Provider>
// );

// describe('useCloudSetup', () => {
//   it('throws if used outside provider', () => {
//     expect(() => renderHook(() => useCloudSetup())).toThrow(
//       'useCloudSetup must be used within a CloudSetupProvider'
//     );
//   });

//   it('returns correct defaultProvider and templateName', () => {
//     const { result } = renderHook(() => useCloudSetup(), { wrapper });
//     expect(result.current.defaultProvider).toBe(AWS_PROVIDER);
//     expect(result.current.templateName).toBe('test-template');
//   });

//   it('returns correct awsPolicyType and awsOverviewPath', () => {
//     const { result } = renderHook(() => useCloudSetup(), { wrapper });
//     expect(result.current.awsPolicyType).toBe('aws-input-type');
//     expect(result.current.awsOverviewPath).toBe('/aws/start');
//   });

//   it('returns correct azurePolicyType and azureOverviewPath', () => {
//     const { result } = renderHook(() => useCloudSetup(), { wrapper });
//     expect(result.current.azurePolicyType).toBe('azure-input-type');
//     expect(result.current.azureOverviewPath).toBe('/azure/start');
//   });

//   it('returns correct gcpPolicyType and gcpOverviewPath', () => {
//     const { result } = renderHook(() => useCloudSetup(), { wrapper });
//     expect(result.current.gcpPolicyType).toBe('gcp-input-type');
//     expect(result.current.gcpOverviewPath).toBe('/gcp/start');
//   });

//   it('getCloudSetupProviderByInputType returns correct provider', () => {
//     const { result } = renderHook(() => useCloudSetup(), { wrapper });
//     expect(result.current.getCloudSetupProviderByInputType('aws-input-type')).toBe(AWS_PROVIDER);
//     expect(result.current.getCloudSetupProviderByInputType('gcp-input-type')).toBe(GCP_PROVIDER);
//     expect(result.current.getCloudSetupProviderByInputType('azure-input-type')).toBe(
//       AZURE_PROVIDER
//     );
//   });

//   it('getCloudSetupProviderByInputType throws on unknown input', () => {
//     const { result } = renderHook(() => useCloudSetup(), { wrapper });
//     expect(() => result.current.getCloudSetupProviderByInputType('unknown')).toThrow(
//       'Unknown cloud setup provider for input type: unknown'
//     );
//   });

//   it('templateInputOptions returns correct options', () => {
//     const { result } = renderHook(() => useCloudSetup(), { wrapper });
//     const options = result.current.templateInputOptions;
//     expect(options).toEqual(
//       expect.arrayContaining([
//         expect.objectContaining({ value: AWS_PROVIDER }),
//         expect.objectContaining({ value: GCP_PROVIDER }),
//         expect.objectContaining({ value: AZURE_PROVIDER }),
//       ])
//     );
//   });
// });
