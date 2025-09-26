/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  createMockPackageInfo,
  createFleetPluginMocks,
  createUtilsMocks,
  createMockCredentialFields,
  createValidationTestScenarios,
  createTestDescription,
  getMockedFunctions,
} from './shared_mocks';

interface CredentialInputProps {
  fields: Array<{
    id: string;
    label: string;
    type: 'text' | 'password';
    value: string;
    testSubj?: string;
    isSecret?: boolean;
  } | null>;
  packageInfo: unknown;
  onChange: (key: string, value: string) => void;
  hasInvalidRequiredVars: boolean;
}

/**
 * Reusable test suite factory for credential input components
 * This demonstrates how shared mocks enable cross-functional test patterns
 */
export const createCredentialInputTestSuite = (
  ComponentUnderTest: React.ComponentType<CredentialInputProps>,
  provider: 'azure' | 'aws' | 'gcp'
) => {
  // Set up shared mocks that work across all providers
  jest.mock('@kbn/fleet-plugin/public', () => createFleetPluginMocks());
  jest.mock('../utils', () => createUtilsMocks());

  const mockFields = createMockCredentialFields();
  const validationScenarios = createValidationTestScenarios();
  const mockedFunctions = getMockedFunctions();

  return () => {
    describe(
      createTestDescription(ComponentUnderTest.displayName || 'Component', 'test suite'),
      () => {
        const mockPackageInfo = createMockPackageInfo();
        const mockOnChange = jest.fn();

        beforeEach(() => {
          jest.clearAllMocks();
        });

        describe('Field Rendering', () => {
          it(createTestDescription('text field', 'renders correctly'), () => {
            const fields = [mockFields[provider].text];

            render(
              <ComponentUnderTest
                fields={fields}
                packageInfo={mockPackageInfo}
                onChange={mockOnChange}
                hasInvalidRequiredVars={false}
              />
            );

            expect(screen.getByDisplayValue(mockFields[provider].text.value)).toBeInTheDocument();
            if (mockFields[provider].text.testSubj) {
              expect(screen.getByTestId(mockFields[provider].text.testSubj)).toBeInTheDocument();
            }
          });

          it(createTestDescription('secret field', 'renders correctly'), () => {
            const fields = [mockFields[provider].secret];

            render(
              <ComponentUnderTest
                fields={fields}
                packageInfo={mockPackageInfo}
                onChange={mockOnChange}
                hasInvalidRequiredVars={false}
              />
            );

            expect(screen.getByTestId('lazy-package-policy-input-var-field')).toBeInTheDocument();
            expect(
              screen.getByTestId(`secret-field-${mockFields[provider].secret.id}`)
            ).toBeInTheDocument();
          });
        });

        describe('Field Interactions', () => {
          it(createTestDescription('text field changes', 'calls onChange'), () => {
            const fields = [{ ...mockFields[provider].text, value: '' }];

            render(
              <ComponentUnderTest
                fields={fields}
                packageInfo={mockPackageInfo}
                onChange={mockOnChange}
                hasInvalidRequiredVars={false}
              />
            );

            const testSubj = mockFields[provider].text.testSubj;
            if (testSubj) {
              const input = screen.getByTestId(testSubj);
              fireEvent.change(input, { target: { value: 'new-value' } });

              expect(mockOnChange).toHaveBeenCalledWith(mockFields[provider].text.id, 'new-value');
            }
          });

          it(createTestDescription('secret field changes', 'calls onChange'), () => {
            const fields = [{ ...mockFields[provider].secret, value: '' }];

            render(
              <ComponentUnderTest
                fields={fields}
                packageInfo={mockPackageInfo}
                onChange={mockOnChange}
                hasInvalidRequiredVars={false}
              />
            );

            const input = screen.getByTestId(`secret-field-${mockFields[provider].secret.id}`);
            fireEvent.change(input, { target: { value: 'new-secret' } });

            expect(mockOnChange).toHaveBeenCalledWith(mockFields[provider].secret.id, 'new-secret');
          });
        });

        describe('Validation Behavior', () => {
          Object.entries(validationScenarios).forEach(([scenario, config]) => {
            it(config.description, () => {
              const fields = [
                {
                  ...mockFields[provider].text,
                  value: 'value' in config ? config.value : mockFields[provider].text.value,
                },
              ];

              render(
                <ComponentUnderTest
                  fields={fields}
                  packageInfo={mockPackageInfo}
                  onChange={mockOnChange}
                  hasInvalidRequiredVars={config.hasInvalidRequiredVars}
                />
              );

              const errorElements = screen.queryAllByTestId('field-error');
              expect(errorElements).toHaveLength(config.expectedErrorCount);
            });
          });
        });

        describe('Edge Cases', () => {
          it(createTestDescription('empty fields array', 'renders without errors'), () => {
            const { container } = render(
              <ComponentUnderTest
                fields={[]}
                packageInfo={mockPackageInfo}
                onChange={mockOnChange}
                hasInvalidRequiredVars={false}
              />
            );

            expect(container.firstChild).toBeEmptyDOMElement();
          });

          it(createTestDescription('null fields', 'handles gracefully'), () => {
            // This test would be specific to each component's implementation
            // but shows how shared patterns can be extended
            expect(() => {
              render(
                <ComponentUnderTest
                  fields={[null, mockFields[provider].text]}
                  packageInfo={mockPackageInfo}
                  onChange={mockOnChange}
                  hasInvalidRequiredVars={false}
                />
              );
            }).not.toThrow();
          });
        });

        describe('Mock Function Verification', () => {
          it('uses shared mocked functions correctly', () => {
            const fields = [{ ...mockFields[provider].text, value: '' }];

            render(
              <ComponentUnderTest
                fields={fields}
                packageInfo={mockPackageInfo}
                onChange={mockOnChange}
                hasInvalidRequiredVars={true}
              />
            );

            // Verify mocked utility functions were called
            expect(mockedFunctions.fieldIsInvalid).toHaveBeenCalled();
            expect(mockedFunctions.findVariableDef).toHaveBeenCalled();
          });
        });
      }
    );
  };
};

/**
 * Example usage - this could be exported and reused across test files:
 *
 * // In azure_input_var_fields.test.tsx:
 * import { AzureInputVarFields } from './azure_input_var_fields';
 * import { createCredentialInputTestSuite } from '../test/reusable_test_suites';
 *
 * describe('AzureInputVarFields', createCredentialInputTestSuite(AzureInputVarFields, 'azure'));
 *
 * // In aws_input_var_fields.test.tsx:
 * import { AwsInputVarFields } from './aws_input_var_fields';
 * import { createCredentialInputTestSuite } from '../test/reusable_test_suites';
 *
 * describe('AwsInputVarFields', createCredentialInputTestSuite(AwsInputVarFields, 'aws'));
 */
