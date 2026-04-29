/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { OnboardingContextProvider, useOnboardingContext } from './onboarding_context';
import { useLicense } from '../../common/hooks/use_license';
import { hasCapabilities } from '../../common/lib/capabilities';
import { ExperimentalFeaturesService } from '../../common/experimental_features_service';

jest.mock('../../common/lib/kibana/kibana_react', () => ({
  useKibana: jest.fn().mockReturnValue({ services: { application: { capabilities: {} } } }),
}));
jest.mock('../../common/lib/capabilities', () => ({ hasCapabilities: jest.fn() }));
const mockHasCapabilities = hasCapabilities as jest.Mock;

jest.mock('../../common/hooks/use_license', () => ({ useLicense: jest.fn() }));
const mockUseLicense = useLicense as jest.Mock;

jest.mock('../../common/experimental_features_service', () => ({
  ExperimentalFeaturesService: { get: jest.fn() },
}));
const mockExperimentalFeatures = ExperimentalFeaturesService.get as jest.Mock;

jest.mock('../config', () => ({
  onboardingConfig: [
    {
      id: 'default',
      body: [
        {
          id: 'defaultGroup1',
          cards: [{ id: 'defaultCard1' }],
        },
      ],
    },
    {
      id: 'topic1',
      experimentalFlagRequired: 'flag1',
      licenseTypeRequired: 'gold',
      capabilitiesRequired: ['capability1'],
      body: [
        {
          id: 'topic1Group1',
          cards: [{ id: 'topic1Card1' }],
        },
      ],
    },
    {
      id: 'topic2',
      body: [
        {
          id: 'topic2Group1',
          cards: [
            { id: 'topic2Card1', experimentalFlagRequired: 'flag1' },
            { id: 'topic2Card2', licenseTypeRequired: 'gold' },
            { id: 'topic2Card3', capabilitiesRequired: ['capability1'] },
          ],
        },
      ],
    },
  ],
}));

const wrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <OnboardingContextProvider spaceId="space1">{children}</OnboardingContextProvider>
);

describe('OnboardingContextProvider', () => {
  describe('config', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockExperimentalFeatures.mockReturnValue({ flag1: true });
      mockUseLicense.mockReturnValue({ isAtLeast: jest.fn(() => true) });
      mockHasCapabilities.mockReturnValue(true);
    });

    describe('when all requirements are met', () => {
      it('should return all topics config correctly', () => {
        const { result } = renderHook(useOnboardingContext, { wrapper });
        expect(result.current.config.size).toEqual(3);
        expect(result.current.config).toMatchSnapshot();
      });
    });

    describe('when the required experimental flag is not met', () => {
      beforeEach(() => {
        mockExperimentalFeatures.mockReturnValue({});
      });

      it('should filter the topics config correctly', () => {
        const { result } = renderHook(useOnboardingContext, { wrapper });
        expect(result.current.config.size).toEqual(2);
        expect(result.current.config).toMatchSnapshot();
      });

      describe('and the required license is not met either', () => {
        beforeEach(() => {
          mockUseLicense.mockReturnValue({ isAtLeast: jest.fn(() => false) });
        });

        it('should filter the topics config correctly', () => {
          const { result } = renderHook(useOnboardingContext, { wrapper });
          expect(result.current.config.size).toEqual(2);
          expect(result.current.config).toMatchSnapshot();
        });

        describe('and the required capabilities are not met either', () => {
          beforeEach(() => {
            mockHasCapabilities.mockReturnValue(false);
          });

          it('should return only the default topics config', () => {
            const { result } = renderHook(useOnboardingContext, { wrapper });
            expect(result.current.config.size).toEqual(1);
            expect(result.current.config).toMatchSnapshot();
          });
        });
      });
    });

    describe('when the required license is not met', () => {
      beforeEach(() => {
        mockUseLicense.mockReturnValue({ isAtLeast: jest.fn(() => false) });
      });

      it('should filter the topics config correctly', () => {
        const { result } = renderHook(useOnboardingContext, { wrapper });
        expect(result.current.config.size).toEqual(2);
        expect(result.current.config).toMatchSnapshot();
      });

      describe('and the required capabilities are not met either', () => {
        beforeEach(() => {
          mockHasCapabilities.mockReturnValue(false);
        });

        it('should filter the topics config correctly', () => {
          const { result } = renderHook(useOnboardingContext, { wrapper });
          expect(result.current.config.size).toEqual(2);
          expect(result.current.config).toMatchSnapshot();
        });
      });
    });

    describe('when the required capabilities are not met', () => {
      beforeEach(() => {
        mockHasCapabilities.mockReturnValue(false);
      });

      it('should filter the topics config correctly', () => {
        const { result } = renderHook(useOnboardingContext, { wrapper });
        expect(result.current.config.size).toEqual(2);
        expect(result.current.config).toMatchSnapshot();
      });
    });
  });
});
