/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CustomYaraSignaturesValidator } from './custom_yara_signatures_validator';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { createMockEndpointAppContextService } from '../../../endpoint/mocks';
import { ExceptionsListItemGenerator } from '../../../../common/endpoint/data_generators/exceptions_list_item_generator';
import { EndpointArtifactExceptionValidationError } from './errors';
import type {
  CreateExceptionListItemOptions,
  UpdateExceptionListItemOptions,
} from '@kbn/lists-plugin/server';
import type { ExperimentalFeatures } from '../../../../common';
import type { Mutable } from 'utility-types';
import { validateYaraRule } from '../../../endpoint/lib/libyara';

jest.mock('../../../endpoint/lib/libyara', () => ({
  validateYaraRule: jest.fn(async () => ({ errors: [], warnings: [] })),
}));

const mockValidateYaraRule = validateYaraRule as jest.MockedFunction<typeof validateYaraRule>;

describe('YARA Signatures API validations', () => {
  let mockEndpointAppContextService: ReturnType<typeof createMockEndpointAppContextService>;
  let customYaraSignaturesValidator: CustomYaraSignaturesValidator;
  let exceptionsGenerator: ExceptionsListItemGenerator;

  beforeEach(() => {
    mockEndpointAppContextService = createMockEndpointAppContextService();

    customYaraSignaturesValidator = new CustomYaraSignaturesValidator(
      mockEndpointAppContextService,
      httpServerMock.createKibanaRequest()
    );
    exceptionsGenerator = new ExceptionsListItemGenerator();
    mockValidateYaraRule.mockReset();
    mockValidateYaraRule.mockResolvedValue({ errors: [], warnings: [] });
  });

  it('should initialize', () => {
    expect(customYaraSignaturesValidator).not.toBeUndefined();
  });

  describe('Feature flag validation', () => {
    describe('when custom YARA signatures feature is disabled', () => {
      beforeEach(() => {
        (
          mockEndpointAppContextService.experimentalFeatures as Mutable<ExperimentalFeatures>
        ).customYaraSignaturesEnabled = false;
      });

      it('should throw error on validatePreCreateItem', async () => {
        const item =
          exceptionsGenerator.generateCustomYaraSignatureForCreate() as unknown as CreateExceptionListItemOptions;

        await expect(customYaraSignaturesValidator.validatePreCreateItem(item)).rejects.toThrow(
          EndpointArtifactExceptionValidationError
        );
        await expect(customYaraSignaturesValidator.validatePreCreateItem(item)).rejects.toThrow(
          'Custom YARA signatures feature is not released yet'
        );
      });

      it('should throw error on validatePreUpdateItem', async () => {
        const currentItem = exceptionsGenerator.generateCustomYaraSignature();
        const updatedItem =
          exceptionsGenerator.generateCustomYaraSignatureForUpdate() as unknown as UpdateExceptionListItemOptions;

        await expect(
          customYaraSignaturesValidator.validatePreUpdateItem(updatedItem, currentItem)
        ).rejects.toThrow(EndpointArtifactExceptionValidationError);
        await expect(
          customYaraSignaturesValidator.validatePreUpdateItem(updatedItem, currentItem)
        ).rejects.toThrow('Custom YARA signatures feature is not released yet');
      });

      it('should throw error on validatePreDeleteItem', async () => {
        const item = exceptionsGenerator.generateCustomYaraSignature();

        await expect(customYaraSignaturesValidator.validatePreDeleteItem(item)).rejects.toThrow(
          EndpointArtifactExceptionValidationError
        );
        await expect(customYaraSignaturesValidator.validatePreDeleteItem(item)).rejects.toThrow(
          'Custom YARA signatures feature is not released yet'
        );
      });

      it('should throw error on validatePreGetOneItem', async () => {
        const item = exceptionsGenerator.generateCustomYaraSignature();

        await expect(customYaraSignaturesValidator.validatePreGetOneItem(item)).rejects.toThrow(
          EndpointArtifactExceptionValidationError
        );
        await expect(customYaraSignaturesValidator.validatePreGetOneItem(item)).rejects.toThrow(
          'Custom YARA signatures feature is not released yet'
        );
      });

      it('should throw error on validatePreMultiListFind', async () => {
        await expect(customYaraSignaturesValidator.validatePreMultiListFind()).rejects.toThrow(
          EndpointArtifactExceptionValidationError
        );
        await expect(customYaraSignaturesValidator.validatePreMultiListFind()).rejects.toThrow(
          'Custom YARA signatures feature is not released yet'
        );
      });

      it('should throw error on validatePreSingleListFind', async () => {
        await expect(customYaraSignaturesValidator.validatePreSingleListFind()).rejects.toThrow(
          EndpointArtifactExceptionValidationError
        );
        await expect(customYaraSignaturesValidator.validatePreSingleListFind()).rejects.toThrow(
          'Custom YARA signatures feature is not released yet'
        );
      });

      it('should throw error on validatePreExport', async () => {
        await expect(customYaraSignaturesValidator.validatePreExport()).rejects.toThrow(
          EndpointArtifactExceptionValidationError
        );
        await expect(customYaraSignaturesValidator.validatePreExport()).rejects.toThrow(
          'Custom YARA signatures feature is not released yet'
        );
      });

      it('should throw error on validatePreGetListSummary', async () => {
        await expect(customYaraSignaturesValidator.validatePreGetListSummary()).rejects.toThrow(
          EndpointArtifactExceptionValidationError
        );
        await expect(customYaraSignaturesValidator.validatePreGetListSummary()).rejects.toThrow(
          'Custom YARA signatures feature is not released yet'
        );
      });

      it('should throw error on validatePreImport', async () => {
        await expect(
          customYaraSignaturesValidator.validatePreImport({ lists: [], items: [] })
        ).rejects.toThrow(EndpointArtifactExceptionValidationError);
        await expect(
          customYaraSignaturesValidator.validatePreImport({ lists: [], items: [] })
        ).rejects.toThrow('Custom YARA signatures feature is not released yet');
      });
    });

    describe('when custom YARA signatures feature is enabled', () => {
      beforeEach(() => {
        (
          mockEndpointAppContextService.experimentalFeatures as Mutable<ExperimentalFeatures>
        ).customYaraSignaturesEnabled = true;
      });

      it('should not throw error on validatePreCreateItem', async () => {
        const item =
          exceptionsGenerator.generateCustomYaraSignatureForCreate() as unknown as CreateExceptionListItemOptions;

        try {
          await customYaraSignaturesValidator.validatePreCreateItem(item);
        } catch (error) {
          // If it throws, it should not be the feature flag error
          expect(error.message).not.toContain('Custom YARA signatures feature is not released yet');
        }
      });

      it('should not throw error on validatePreUpdateItem', async () => {
        const currentItem = exceptionsGenerator.generateCustomYaraSignature();
        const updatedItem =
          exceptionsGenerator.generateCustomYaraSignatureForUpdate() as unknown as UpdateExceptionListItemOptions;

        try {
          await customYaraSignaturesValidator.validatePreUpdateItem(updatedItem, currentItem);
        } catch (error) {
          expect(error.message).not.toContain('Custom YARA signatures feature is not released yet');
        }
      });

      it('should not throw error on validatePreDeleteItem', async () => {
        const item = exceptionsGenerator.generateCustomYaraSignature();

        try {
          await customYaraSignaturesValidator.validatePreDeleteItem(item);
        } catch (error) {
          expect(error.message).not.toContain('Custom YARA signatures feature is not released yet');
        }
      });

      it('should not throw error on validatePreGetOneItem', async () => {
        const item = exceptionsGenerator.generateCustomYaraSignature();

        try {
          await customYaraSignaturesValidator.validatePreGetOneItem(item);
        } catch (error) {
          expect(error.message).not.toContain('Custom YARA signatures feature is not released yet');
        }
      });

      it('should not throw error on validatePreMultiListFind', async () => {
        try {
          await customYaraSignaturesValidator.validatePreMultiListFind();
        } catch (error) {
          expect(error.message).not.toContain('Custom YARA signatures feature is not released yet');
        }
      });

      it('should not throw error on validatePreSingleListFind', async () => {
        try {
          await customYaraSignaturesValidator.validatePreSingleListFind();
        } catch (error) {
          expect(error.message).not.toContain('Custom YARA signatures feature is not released yet');
        }
      });

      it('should not throw error on validatePreExport', async () => {
        try {
          await customYaraSignaturesValidator.validatePreExport();
        } catch (error) {
          expect(error.message).not.toContain('Custom YARA signatures feature is not released yet');
        }
      });

      it('should not throw error on validatePreGetListSummary', async () => {
        try {
          await customYaraSignaturesValidator.validatePreGetListSummary();
        } catch (error) {
          expect(error.message).not.toContain('Custom YARA signatures feature is not released yet');
        }
      });

      it('should not throw error on validatePreImport', async () => {
        try {
          await customYaraSignaturesValidator.validatePreImport({ lists: [], items: [] });
        } catch (error) {
          expect(error.message).not.toContain('Custom YARA signatures feature is not released yet');
        }
      });
    });
  });
  // -----------------------------------------------------------------------------
  //
  //  API TESTS FOR THIS ARTIFACT TYPE SHOULD BE COVERED WITH INTEGRATION TESTS.
  //  ADD THEM HERE:
  //
  //  `x-pack/solutions/security/test/security_solution_api_integration/test_suites/edr_workflows`
  //
  // -----------------------------------------------------------------------------

  describe('libyara compile validation', () => {
    beforeEach(() => {
      (
        mockEndpointAppContextService.experimentalFeatures as Mutable<ExperimentalFeatures>
      ).customYaraSignaturesEnabled = true;
    });

    const buildCreateItem = (): CreateExceptionListItemOptions => {
      const generated = exceptionsGenerator.generateCustomYaraSignatureForCreate();
      return {
        ...generated,
        namespaceType: 'agnostic',
        osTypes: generated.os_types,
        listId: generated.list_id,
        itemId: generated.item_id,
      } as unknown as CreateExceptionListItemOptions;
    };

    it('rejects create when libyara reports compile errors', async () => {
      mockValidateYaraRule.mockResolvedValue({
        errors: [{ severity: 'error', message: 'syntax error', line: 2 }],
        warnings: [],
      });

      await expect(
        customYaraSignaturesValidator.validatePreCreateItem(buildCreateItem())
      ).rejects.toThrow(/Invalid YARA rule \(libyara 4\.3\.2\): line 2: syntax error/);
      expect(mockValidateYaraRule).toHaveBeenCalled();
    });

    it('allows create when libyara only returns warnings', async () => {
      mockValidateYaraRule.mockResolvedValue({
        errors: [],
        warnings: [{ severity: 'warning', message: 'may slow down scanning', line: 1 }],
      });

      try {
        await customYaraSignaturesValidator.validatePreCreateItem(buildCreateItem());
      } catch (error) {
        expect(error.message).not.toContain('Invalid YARA rule');
      }
    });
  });
});
