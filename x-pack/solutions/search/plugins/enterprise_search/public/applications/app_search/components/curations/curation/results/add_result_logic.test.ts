/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../../../__mocks__/kea_logic';
import '../../../../__mocks__/engine_logic.mock';

import { AddResultLogic } from '.';

describe('AddResultLogic', () => {
  const { mount } = new LogicMounter(AddResultLogic);

  const DEFAULT_VALUES = {
    isFlyoutOpen: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has expected default values', () => {
    mount();
    expect(AddResultLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('openFlyout', () => {
      it('sets isFlyoutOpen to true and resets the searchQuery term', () => {
        mount({ isFlyoutOpen: false, searchQuery: 'a previous search' });

        AddResultLogic.actions.openFlyout();

        expect(AddResultLogic.values).toEqual({
          ...DEFAULT_VALUES,
          isFlyoutOpen: true,
        });
      });
    });

    describe('closeFlyout', () => {
      it('sets isFlyoutOpen to false', () => {
        mount({ isFlyoutOpen: true });

        AddResultLogic.actions.closeFlyout();

        expect(AddResultLogic.values).toEqual({
          ...DEFAULT_VALUES,
          isFlyoutOpen: false,
        });
      });
    });
  });
});
