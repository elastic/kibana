/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./crawler_domain_detail_logic', () => ({
  CrawlerDomainDetailLogic: {
    actions: {
      updateEntryPoints: jest.fn(),
    },
  },
}));

import { LogicMounter, mockFlashMessageHelpers } from '../../../../../__mocks__/kea_logic';

import { CrawlerDomainDetailLogic } from './crawler_domain_detail_logic';
import { EntryPointsTableLogic } from './entry_points_table_logic';

describe('EntryPointsTableLogic', () => {
  const { mount } = new LogicMounter(EntryPointsTableLogic);
  const { clearFlashMessages, flashSuccessToast } = mockFlashMessageHelpers;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listeners', () => {
    describe('onAdd', () => {
      it('should update the entry points for the current domain, and clear flash messages', () => {
        const entryThatWasAdded = { id: '2', value: 'bar' };
        const updatedEntries = [
          { id: '1', value: 'foo' },
          { id: '2', value: 'bar' },
        ];
        mount();
        EntryPointsTableLogic.actions.onAdd(entryThatWasAdded, updatedEntries);
        expect(CrawlerDomainDetailLogic.actions.updateEntryPoints).toHaveBeenCalledWith(
          updatedEntries
        );
        expect(clearFlashMessages).toHaveBeenCalled();
      });
    });

    describe('onDelete', () => {
      it('should update the entry points for the current domain, clear flash messages, and show a success toast', () => {
        const entryThatWasDeleted = { id: '2', value: 'bar' };
        const updatedEntries = [{ id: '1', value: 'foo' }];
        mount();
        EntryPointsTableLogic.actions.onDelete(entryThatWasDeleted, updatedEntries);
        expect(CrawlerDomainDetailLogic.actions.updateEntryPoints).toHaveBeenCalledWith(
          updatedEntries
        );
        expect(clearFlashMessages).toHaveBeenCalled();
        expect(flashSuccessToast).toHaveBeenCalled();
      });
    });

    describe('onUpdate', () => {
      it('should update the entry points for the current domain, clear flash messages, and show a success toast', () => {
        const entryThatWasUpdated = { id: '2', value: 'baz' };
        const updatedEntries = [
          { id: '1', value: 'foo' },
          { id: '2', value: 'baz' },
        ];
        mount();
        EntryPointsTableLogic.actions.onUpdate(entryThatWasUpdated, updatedEntries);
        expect(CrawlerDomainDetailLogic.actions.updateEntryPoints).toHaveBeenCalledWith(
          updatedEntries
        );
        expect(clearFlashMessages).toHaveBeenCalled();
      });
    });
  });
});
