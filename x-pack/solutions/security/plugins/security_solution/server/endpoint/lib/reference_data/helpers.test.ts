/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pRetry from 'p-retry';
import type { SavedObjectsServiceStart, SavedObject } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { savedObjectsServiceMock } from '@kbn/core-saved-objects-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import { allowedExperimentalValues } from '../../../../common';
import type { ExperimentalFeatures } from '../../../../common';
import { initializeEndpointExceptionsPerPolicyOptInStatus } from './helpers';
import { REF_DATA_KEYS, REFERENCE_DATA_SAVED_OBJECT_TYPE } from './constants';
import type { OptInStatusMetadata, ReferenceDataSavedObject } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock('p-retry', () => {
  const originalPRetry = jest.requireActual('p-retry');
  return jest.fn().mockImplementation((fn, options) => {
    return originalPRetry(fn, options);
  });
});

const pRetryMock = jest.mocked(pRetry);

jest.mock('@kbn/core/server', () => {
  const actual = jest.requireActual('@kbn/core/server');
  return {
    ...actual,
    SavedObjectsClient: jest.fn().mockImplementation((repo: any) => repo),
  };
});

describe('initializeEndpointExceptionsPerPolicyOptInStatus', () => {
  let savedObjectsServiceStart: jest.Mocked<SavedObjectsServiceStart>;
  let soClientMock: ReturnType<typeof savedObjectsClientMock.create>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let experimentalFeatures: ExperimentalFeatures;

  beforeEach(() => {
    pRetryMock.mockClear();

    logger = loggingSystemMock.createLogger();
    soClientMock = savedObjectsClientMock.create();

    savedObjectsServiceStart = savedObjectsServiceMock.createStartContract();
    savedObjectsServiceStart.createInternalRepository.mockReturnValue(soClientMock as any);

    experimentalFeatures = { ...allowedExperimentalValues };
  });

  const setUpSoClientToReturnExistingOptInStatus = (optInStatus: OptInStatusMetadata): void => {
    soClientMock.get.mockResolvedValue({
      id: REF_DATA_KEYS.endpointExceptionsPerPolicyOptInStatus,
      type: REFERENCE_DATA_SAVED_OBJECT_TYPE,
      attributes: {
        id: REF_DATA_KEYS.endpointExceptionsPerPolicyOptInStatus,
        owner: 'EDR',
        type: 'OPT-IN-STATUS',
        metadata: optInStatus,
      },
      references: [],
    } as SavedObject<ReferenceDataSavedObject<OptInStatusMetadata>>);
  };

  const setUpSoClientToCreateInitialValue = (): void => {
    // SO .get() returns not-found, which triggers initial value creation
    soClientMock.get.mockRejectedValue(SavedObjectsErrorHelpers.createGenericNotFoundError());

    // SO .create() returns the created object
    soClientMock.create.mockImplementation(async (_type, data: any) => ({
      id: data.id,
      type: REFERENCE_DATA_SAVED_OBJECT_TYPE,
      attributes: data,
      references: [],
    }));
  };

  describe('logging on successful initialization', () => {
    it('should create internal repository with the reference data SO type', async () => {
      setUpSoClientToReturnExistingOptInStatus({ status: false });

      await initializeEndpointExceptionsPerPolicyOptInStatus(
        savedObjectsServiceStart,
        experimentalFeatures,
        logger
      );

      expect(savedObjectsServiceStart.createInternalRepository).toHaveBeenCalledWith([
        REFERENCE_DATA_SAVED_OBJECT_TYPE,
      ]);
    });

    it('should log the opt-in status when opted in', async () => {
      setUpSoClientToReturnExistingOptInStatus({
        status: true,
        reason: 'newDeployment',
        user: 'automatic-opt-in',
        timestamp: '2026-01-01T00:00:00.000Z',
      });

      await initializeEndpointExceptionsPerPolicyOptInStatus(
        savedObjectsServiceStart,
        experimentalFeatures,
        logger
      );

      expect(logger.info).toHaveBeenCalledWith(
        "Endpoint Exceptions per-policy opt-in status is 'true' (reason: 'newDeployment')."
      );
    });

    it('should log the opt-in status when not opted in yet (no reason)', async () => {
      setUpSoClientToReturnExistingOptInStatus({ status: false });

      await initializeEndpointExceptionsPerPolicyOptInStatus(
        savedObjectsServiceStart,
        experimentalFeatures,
        logger
      );

      expect(logger.info).toHaveBeenCalledWith(
        "Endpoint Exceptions per-policy opt-in status is 'false'."
      );
    });
  });

  describe('initial value creation', () => {
    beforeEach(() => {
      setUpSoClientToCreateInitialValue();
    });

    it('should not call SO .create() if the reference data already exists', async () => {
      setUpSoClientToReturnExistingOptInStatus({ status: false });

      await initializeEndpointExceptionsPerPolicyOptInStatus(
        savedObjectsServiceStart,
        experimentalFeatures,
        logger
      );

      expect(soClientMock.create).not.toHaveBeenCalled();
    });

    it('should opt-in automatically when FF is enabled and no endpoint exception list exists', async () => {
      experimentalFeatures = {
        ...allowedExperimentalValues,
        endpointExceptionsMovedUnderManagement: true,
      };

      // No endpoint exception list found - indicates a new deployment
      soClientMock.find.mockResolvedValue({
        total: 0,
        saved_objects: [],
        per_page: 20,
        page: 1,
      });

      await initializeEndpointExceptionsPerPolicyOptInStatus(
        savedObjectsServiceStart,
        experimentalFeatures,
        logger
      );

      expect(soClientMock.create).toHaveBeenCalledWith(
        REFERENCE_DATA_SAVED_OBJECT_TYPE,
        expect.objectContaining({
          metadata: expect.objectContaining({
            status: true,
            reason: 'newDeployment',
            user: 'automatic-opt-in',
          }),
        }),
        expect.objectContaining({
          id: REF_DATA_KEYS.endpointExceptionsPerPolicyOptInStatus,
        })
      );

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Endpoint Exceptions per-policy opt-in status is 'true'")
      );
    });

    it('should not opt-in when FF is enabled but endpoint exception list already exists', async () => {
      experimentalFeatures = {
        ...allowedExperimentalValues,
        endpointExceptionsMovedUnderManagement: true,
      };

      // Endpoint exception list exists - existing deployment
      soClientMock.find.mockResolvedValue({
        total: 1,
        saved_objects: [
          {
            id: 'some-id',
            type: 'exception-list-agnostic',
            attributes: { list_id: ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id },
            references: [],
            score: 1,
          },
        ],
        per_page: 20,
        page: 1,
      });

      await initializeEndpointExceptionsPerPolicyOptInStatus(
        savedObjectsServiceStart,
        experimentalFeatures,
        logger
      );

      expect(soClientMock.create).toHaveBeenCalledWith(
        REFERENCE_DATA_SAVED_OBJECT_TYPE,
        expect.objectContaining({
          metadata: expect.objectContaining({
            status: false,
          }),
        }),
        expect.objectContaining({
          id: REF_DATA_KEYS.endpointExceptionsPerPolicyOptInStatus,
        })
      );
      expect(soClientMock.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'exception-list-agnostic',
          filter: `exception-list-agnostic.attributes.list_id: ${ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id} AND exception-list-agnostic.attributes.list_type: list`,
          perPage: 1,
        })
      );
    });

    it('should not opt-in when FF is disabled', async () => {
      experimentalFeatures = {
        ...allowedExperimentalValues,
        endpointExceptionsMovedUnderManagement: false,
      };

      await initializeEndpointExceptionsPerPolicyOptInStatus(
        savedObjectsServiceStart,
        experimentalFeatures,
        logger
      );

      expect(soClientMock.find).not.toHaveBeenCalled();
      expect(soClientMock.create).toHaveBeenCalledWith(
        REFERENCE_DATA_SAVED_OBJECT_TYPE,
        expect.objectContaining({
          metadata: expect.objectContaining({
            status: false,
          }),
        }),
        expect.any(Object)
      );
    });

    it('should log error when exception list lookup fails', async () => {
      experimentalFeatures = {
        ...allowedExperimentalValues,
        endpointExceptionsMovedUnderManagement: true,
      };

      soClientMock.find.mockRejectedValue(new Error('SO find failed'));

      // Skip real pRetry to avoid retries hanging the test — just call fn once
      pRetryMock.mockImplementationOnce(async (fn: any) => fn());

      await initializeEndpointExceptionsPerPolicyOptInStatus(
        savedObjectsServiceStart,
        experimentalFeatures,
        logger
      );

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error initializing Endpoint Exceptions per-policy opt-in status')
      );
    });
  });

  describe('retry logic', () => {
    it('should call pRetry with correct retry configuration', async () => {
      setUpSoClientToReturnExistingOptInStatus({ status: false });

      await initializeEndpointExceptionsPerPolicyOptInStatus(
        savedObjectsServiceStart,
        experimentalFeatures,
        logger
      );

      expect(pRetry).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          retries: 5,
          minTimeout: 1000,
          maxTimeout: 3000,
          onFailedAttempt: expect.any(Function),
        })
      );
    });

    it('should retry on transient failure and eventually succeed', async () => {
      pRetryMock.mockImplementationOnce((fn: any, options: any) => {
        // Simulate two failures then success
        const mockError1 = {
          message: 'Connection refused',
          attemptNumber: 1,
          retriesLeft: 4,
        };
        options.onFailedAttempt(mockError1);

        const mockError2 = {
          message: 'Connection refused',
          attemptNumber: 2,
          retriesLeft: 3,
        };
        options.onFailedAttempt(mockError2);

        return Promise.resolve(fn());
      });

      setUpSoClientToReturnExistingOptInStatus({ status: false });

      await initializeEndpointExceptionsPerPolicyOptInStatus(
        savedObjectsServiceStart,
        experimentalFeatures,
        logger
      );

      expect(logger.debug).toHaveBeenCalledWith(
        'Attempt 1 to initialize Endpoint Exceptions per-policy opt-in status failed. There are 4 retries left. Error: Connection refused'
      );
      expect(logger.debug).toHaveBeenCalledWith(
        'Attempt 2 to initialize Endpoint Exceptions per-policy opt-in status failed. There are 3 retries left. Error: Connection refused'
      );
    });

    it('should log error when all retries are exhausted', async () => {
      pRetryMock.mockImplementationOnce((_fn: any, _options: any) => {
        return Promise.reject(new Error('All retries exhausted'));
      });

      await initializeEndpointExceptionsPerPolicyOptInStatus(
        savedObjectsServiceStart,
        experimentalFeatures,
        logger
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Error initializing Endpoint Exceptions per-policy opt-in status: All retries exhausted'
      );
    });

    it('should not throw even when initialization fails after retries', async () => {
      pRetryMock.mockImplementationOnce((_fn: any, _options: any) => {
        return Promise.reject(new Error('Persistent failure'));
      });

      await expect(
        initializeEndpointExceptionsPerPolicyOptInStatus(
          savedObjectsServiceStart,
          experimentalFeatures,
          logger
        )
      ).resolves.toBeUndefined();
    });
  });

  describe('concurrent initialization (conflict handling)', () => {
    it('should handle SO conflict error when another instance creates the reference data first', async () => {
      // First .get() returns not-found
      soClientMock.get
        .mockRejectedValueOnce(
          SavedObjectsErrorHelpers.createGenericNotFoundError('cheesefuck', 'dickbutt')
        )
        // Second .get() (called after conflict) returns the existing record
        .mockResolvedValueOnce({
          id: REF_DATA_KEYS.endpointExceptionsPerPolicyOptInStatus,
          type: REFERENCE_DATA_SAVED_OBJECT_TYPE,
          attributes: {
            id: REF_DATA_KEYS.endpointExceptionsPerPolicyOptInStatus,
            owner: 'EDR',
            type: 'OPT-IN-STATUS',
            metadata: { status: true, reason: 'newDeployment' },
          },
          references: [],
        } as SavedObject<ReferenceDataSavedObject<OptInStatusMetadata>>);

      // .create() fails with conflict (another instance beat us to it)
      soClientMock.create.mockRejectedValue(
        SavedObjectsErrorHelpers.createConflictError(
          REFERENCE_DATA_SAVED_OBJECT_TYPE,
          REF_DATA_KEYS.endpointExceptionsPerPolicyOptInStatus
        )
      );

      await initializeEndpointExceptionsPerPolicyOptInStatus(
        savedObjectsServiceStart,
        experimentalFeatures,
        logger
      );

      expect(logger.debug).toHaveBeenCalledWith(
        'Looks like reference data [ENDPOINT-EXCEPTIONS-PER-POLICY-OPT-IN-STATUS] already exists - return it'
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Endpoint Exceptions per-policy opt-in status is 'true'")
      );
    });
  });
});
