/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockHttpValues } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { itShowsServerErrorAsFlashMessage } from '../../../test_helpers';

import { SecurityLogic } from './security_logic';

describe('SecurityLogic', () => {
  const { http } = mockHttpValues;
  const { mount } = new LogicMounter(SecurityLogic);

  beforeEach(() => {
    jest.clearAllMocks();
    mount();
  });

  const defaultValues = {
    dataLoading: true,
    cachedServerState: {},
    isEnabled: false,
    remote: {},
    standard: {},
    unsavedChanges: true,
  };

  const serverProps = {
    isEnabled: true,
    remote: {
      isEnabled: true,
      contentSources: [{ id: 'gmail', name: 'Gmail', isEnabled: true }],
    },
    standard: {
      isEnabled: true,
      contentSources: [{ id: 'one_drive', name: 'OneDrive', isEnabled: true }],
    },
  };

  it('has expected default values', () => {
    expect(SecurityLogic.values).toEqual(defaultValues);
  });

  describe('actions', () => {
    it('setServerProps', () => {
      SecurityLogic.actions.setServerProps(serverProps);

      expect(SecurityLogic.values.isEnabled).toEqual(true);
    });

    it('setSourceRestrictionsUpdated', () => {
      SecurityLogic.actions.setSourceRestrictionsUpdated(serverProps);

      expect(SecurityLogic.values.isEnabled).toEqual(true);
    });

    it('updatePrivateSourcesEnabled', () => {
      SecurityLogic.actions.updatePrivateSourcesEnabled(false);

      expect(SecurityLogic.values.isEnabled).toEqual(false);
    });

    it('updateRemoteEnabled', () => {
      SecurityLogic.actions.updateRemoteEnabled(false);

      expect(SecurityLogic.values.remote.isEnabled).toEqual(false);
    });

    it('updateStandardEnabled', () => {
      SecurityLogic.actions.updateStandardEnabled(false);

      expect(SecurityLogic.values.standard.isEnabled).toEqual(false);
    });

    it('updateRemoteSource', () => {
      SecurityLogic.actions.setServerProps(serverProps);
      SecurityLogic.actions.updateRemoteSource('gmail', false);

      expect(SecurityLogic.values.remote.contentSources[0].isEnabled).toEqual(false);
    });

    it('updateStandardSource', () => {
      SecurityLogic.actions.setServerProps(serverProps);
      SecurityLogic.actions.updateStandardSource('one_drive', false);

      expect(SecurityLogic.values.standard.contentSources[0].isEnabled).toEqual(false);
    });
  });

  describe('selectors', () => {
    describe('unsavedChanges', () => {
      it('returns true while loading', () => {
        expect(SecurityLogic.values.unsavedChanges).toEqual(true);
      });

      it('returns false after loading', () => {
        SecurityLogic.actions.setServerProps(serverProps);

        expect(SecurityLogic.values.unsavedChanges).toEqual(false);
      });
    });
  });

  describe('listeners', () => {
    describe('initializeSourceRestrictions', () => {
      it('calls API and sets values', async () => {
        const setServerPropsSpy = jest.spyOn(SecurityLogic.actions, 'setServerProps');
        http.get.mockReturnValue(Promise.resolve(serverProps));
        SecurityLogic.actions.initializeSourceRestrictions();

        expect(http.get).toHaveBeenCalledWith(
          '/internal/workplace_search/org/security/source_restrictions'
        );
        await nextTick();
        expect(setServerPropsSpy).toHaveBeenCalledWith(serverProps);
      });

      itShowsServerErrorAsFlashMessage(http.get, () => {
        SecurityLogic.actions.initializeSourceRestrictions();
      });
    });

    describe('saveSourceRestrictions', () => {
      it('calls API and sets values', async () => {
        http.patch.mockReturnValue(Promise.resolve(serverProps));
        SecurityLogic.actions.setSourceRestrictionsUpdated(serverProps);
        SecurityLogic.actions.saveSourceRestrictions();

        expect(http.patch).toHaveBeenCalledWith(
          '/internal/workplace_search/org/security/source_restrictions',
          {
            body: JSON.stringify(serverProps),
          }
        );
      });

      itShowsServerErrorAsFlashMessage(http.patch, () => {
        SecurityLogic.actions.saveSourceRestrictions();
      });
    });

    describe('resetState', () => {
      it('calls API and sets values', async () => {
        SecurityLogic.actions.setServerProps(serverProps);
        SecurityLogic.actions.updatePrivateSourcesEnabled(false);
        SecurityLogic.actions.resetState();

        expect(SecurityLogic.values.isEnabled).toEqual(true);
      });
    });
  });
});
