/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import React, { useContext } from 'react';
// import { render, screen } from '@testing-library/react';
// import { CloudSetupContext, CloudSetupProvider } from './cloud_setup_context';
// import { mockConfig } from './test/mock';

// const TestComponent = () => {
//   const context = useContext(CloudSetupContext);
//   if (!context) return <div>{'No context'}</div>;
//   return (
//     <div>
//       <span data-test-subj="integration-name">{context.config.name}</span>
//       <span data-test-subj="default-provider">{context.config.defaultProvider}</span>
//     </div>
//   );
// };

// const createMockProviderProps = {
//   config: mockConfig,
//   uiSettings: mockUiSettings,
//   cloud: mockCloud,
//   ...overrides,
// });

// describe('CloudSetupContext', () => {
//   it('provides the config to children via context', async () => {
//     render(
//       <CloudSetupProvider config={mockConfig}>
//         <TestComponent />
//       </CloudSetupProvider>
//     );
//     expect(screen.getByTestId('integration-name')).toHaveTextContent('Test Integration');
//     expect(screen.getByTestId('default-provider')).toHaveTextContent('aws');
//   });

//   it('returns undefined if used outside the provider', () => {
//     render(<TestComponent />);
//     expect(screen.getByText('No context')).toBeInTheDocument();
//   });
// });
