/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// /*
//  * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
//  * or more contributor license agreements. Licensed under the Elastic License
//  * 2.0; you may not use this file except in compliance with the Elastic License
//  * 2.0.
//  */

// import React from 'react';
// import { storiesOf } from '@storybook/react';
// import { EuiFlyout } from '@elastic/eui';
// import { TestProvider } from '@kbn/expandable-flyout/src/test/provider';
// import { StorybookProviders } from '../../../common/mock/storybook_providers';
// import { mockRiskScoreState } from '../../shared/mocks';
// import { mockManagedServiceData, mockObservedService } from './mocks';
// import { ServicePanelContent } from './content';

// const riskScoreData = { ...mockRiskScoreState, data: [] };

// storiesOf('Components/ServicePanelContent', module)
//   .addDecorator((storyFn) => (
//     <StorybookProviders>
//       <TestProvider>
//         <EuiFlyout size="m" onClose={() => {}}>
//           {storyFn()}
//         </EuiFlyout>
//       </TestProvider>
//     </StorybookProviders>
//   ))
//   .add('default', () => (
//     <ServicePanelContent

//       observedService={mockObservedService}
//       riskScoreState={riskScoreData}
//       contextID={'test-service-details'}
//       scopeId={'test-scopeId'}
//       isDraggable={false}
//       openDetailsPanel={() => {}}
//       serviceName={'test-service-name'}
//       onAssetCriticalityChange={() => {}}
//       recalculatingScore={false}
//       isLinkEnabled={true}
//     />
//   ))
//   .add('integration disabled', () => (
//     <ServicePanelContent

//       observedService={mockObservedService}
//       riskScoreState={riskScoreData}
//       contextID={'test-service-details'}
//       scopeId={'test-scopeId'}
//       isDraggable={false}
//       openDetailsPanel={() => {}}
//       serviceName={'test-service-name'}
//       onAssetCriticalityChange={() => {}}
//       recalculatingScore={false}
//       isLinkEnabled={true}
//     />
//   ))
//   .add('no managed data', () => (
//     <ServicePanelContent

//       observedService={mockObservedService}
//       riskScoreState={riskScoreData}
//       contextID={'test-service-details'}
//       scopeId={'test-scopeId'}
//       isDraggable={false}
//       openDetailsPanel={() => {}}
//       serviceName={'test-service-name'}
//       onAssetCriticalityChange={() => {}}
//       recalculatingScore={false}
//       isLinkEnabled={true}
//     />
//   ))
//   .add('no observed data', () => (
//     <ServicePanelContent

//       observedService={{
//         details: {
//           service: {
//             id: [],
//             domain: [],
//           },
//           host: {
//             ip: [],
//             os: {
//               name: [],
//               family: [],
//             },
//           },
//         },
//         isLoading: false,
//         firstSeen: {
//           isLoading: false,
//           date: undefined,
//         },
//         lastSeen: {
//           isLoading: false,
//           date: undefined,
//         },
//         anomalies: { isLoading: false, anomalies: null, jobNameById: {} },
//       }}
//       riskScoreState={riskScoreData}
//       contextID={'test-service-details'}
//       scopeId={'test-scopeId'}
//       isDraggable={false}
//       openDetailsPanel={() => {}}
//       serviceName={'test-service-name'}
//       onAssetCriticalityChange={() => {}}
//       recalculatingScore={false}
//       isLinkEnabled={true}
//     />
//   ))
//   .add('loading', () => (
//     <ServicePanelContent

//         data: undefined,
//         isLoading: true,
//         isIntegrationEnabled: true,
//       }}
//       observedService={{
//         details: {
//           service: {
//             id: [],
//             domain: [],
//           },
//           host: {
//             ip: [],
//             os: {
//               name: [],
//               family: [],
//             },
//           },
//         },
//         isLoading: true,
//         firstSeen: {
//           isLoading: true,
//           date: undefined,
//         },
//         lastSeen: {
//           isLoading: true,
//           date: undefined,
//         },
//         anomalies: { isLoading: true, anomalies: null, jobNameById: {} },
//       }}
//       riskScoreState={riskScoreData}
//       contextID={'test-service-details'}
//       scopeId={'test-scopeId'}
//       isDraggable={false}
//       openDetailsPanel={() => {}}
//       serviceName={'test-service-name'}
//       onAssetCriticalityChange={() => {}}
//       recalculatingScore={false}
//       isLinkEnabled={true}
//     />
//   ));
