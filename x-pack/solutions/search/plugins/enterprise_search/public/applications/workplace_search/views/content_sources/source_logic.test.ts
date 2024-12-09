/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LogicMounter,
  mockFlashMessageHelpers,
  mockHttpValues,
  mockKibanaValues,
} from '../../../__mocks__/kea_logic';
import { fullContentSources, contentItems } from '../../__mocks__/content_sources.mock';
import { meta } from '../../__mocks__/meta.mock';

import { DEFAULT_META } from '../../../shared/constants';
import { expectedAsyncError } from '../../../test_helpers';

jest.mock('../../app_logic', () => ({
  AppLogic: { values: { isOrganization: true } },
}));
import { itShowsServerErrorAsFlashMessage } from '../../../test_helpers';
import { AppLogic } from '../../app_logic';

import { SourceLogic } from './source_logic';

describe('SourceLogic', () => {
  const { http } = mockHttpValues;
  const { clearFlashMessages, flashAPIErrors, flashSuccessToast, setErrorMessage } =
    mockFlashMessageHelpers;
  const { navigateToUrl } = mockKibanaValues;
  const { mount, getListeners } = new LogicMounter(SourceLogic);

  const contentSource = fullContentSources[0];

  const DEFAULT_VALUES = {
    contentSource: {},
    contentItems: [],
    dataLoading: true,
    sectionLoading: true,
    buttonLoading: false,
    diagnosticDownloadButtonVisible: false,
    contentMeta: DEFAULT_META,
    contentFilterValue: '',
    isConfigurationUpdateButtonLoading: false,
    stagedPrivateKey: null,
  };

  const searchServerResponse = {
    results: contentItems,
    meta,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mount();
  });

  it('has expected default values', () => {
    expect(SourceLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    it('setContentSource', () => {
      SourceLogic.actions.setContentSource(contentSource);

      expect(SourceLogic.values).toEqual({
        ...DEFAULT_VALUES,
        contentSource,
        dataLoading: false,
      });
    });

    it('onUpdateSourceName', () => {
      const NAME = 'foo';
      SourceLogic.actions.setContentSource(contentSource);
      SourceLogic.actions.onUpdateSourceName(NAME);

      expect(SourceLogic.values).toEqual({
        ...DEFAULT_VALUES,
        dataLoading: false,
        contentSource: {
          ...contentSource,
          name: NAME,
        },
      });
      expect(flashSuccessToast).toHaveBeenCalled();
    });

    it('setSearchResults', () => {
      SourceLogic.actions.setSearchResults(searchServerResponse);

      expect(SourceLogic.values).toEqual({
        ...DEFAULT_VALUES,
        contentItems,
        contentMeta: meta,
        sectionLoading: false,
      });
    });

    it('setContentFilterValue', () => {
      const VALUE = 'bar';
      SourceLogic.actions.setSearchResults(searchServerResponse);
      SourceLogic.actions.setContentSource(contentSource);
      SourceLogic.actions.setContentFilterValue(VALUE);

      expect(SourceLogic.values).toEqual({
        ...DEFAULT_VALUES,
        dataLoading: false,
        sectionLoading: false,
        contentItems,
        contentSource,

        contentMeta: {
          ...meta,
          page: {
            ...meta.page,
            current: DEFAULT_META.page.current,
          },
        },
        contentFilterValue: VALUE,
      });
    });

    it('setActivePage', () => {
      const PAGE = 2;
      SourceLogic.actions.setSearchResults(searchServerResponse);
      SourceLogic.actions.setActivePage(PAGE);

      expect(SourceLogic.values).toEqual({
        ...DEFAULT_VALUES,
        contentItems,
        sectionLoading: false,
        contentMeta: {
          ...meta,
          page: {
            ...meta.page,
            current: PAGE,
          },
        },
      });
    });

    it('setButtonNotLoading', () => {
      // Set button state to loading
      SourceLogic.actions.removeContentSource(contentSource.id);
      SourceLogic.actions.setButtonNotLoading();

      expect(SourceLogic.values).toEqual({
        ...DEFAULT_VALUES,
        buttonLoading: false,
      });
    });

    it('showDiagnosticDownloadButton', () => {
      SourceLogic.actions.showDiagnosticDownloadButton();

      expect(SourceLogic.values).toEqual({
        ...DEFAULT_VALUES,
        diagnosticDownloadButtonVisible: true,
      });
    });
  });

  describe('listeners', () => {
    describe('initializeSource', () => {
      it('calls API and sets values (org)', async () => {
        const onInitializeSourceSpy = jest.spyOn(SourceLogic.actions, 'setContentSource');
        const promise = Promise.resolve(contentSource);
        http.get.mockReturnValue(promise);
        SourceLogic.actions.initializeSource(contentSource.id);

        expect(http.get).toHaveBeenCalledWith('/internal/workplace_search/org/sources/123');
        await promise;
        expect(onInitializeSourceSpy).toHaveBeenCalledWith(contentSource);
      });

      it('calls API and sets values (account)', async () => {
        AppLogic.values.isOrganization = false;

        const onInitializeSourceSpy = jest.spyOn(SourceLogic.actions, 'setContentSource');
        const promise = Promise.resolve(contentSource);
        http.get.mockReturnValue(promise);
        SourceLogic.actions.initializeSource(contentSource.id);

        expect(http.get).toHaveBeenCalledWith('/internal/workplace_search/account/sources/123');
        await promise;
        expect(onInitializeSourceSpy).toHaveBeenCalledWith(contentSource);
      });

      it('handles federated source', async () => {
        AppLogic.values.isOrganization = false;

        const initializeFederatedSummarySpy = jest.spyOn(
          SourceLogic.actions,
          'initializeFederatedSummary'
        );
        const promise = Promise.resolve({
          ...contentSource,
          isFederatedSource: true,
        });
        http.get.mockReturnValue(promise);
        SourceLogic.actions.initializeSource(contentSource.id);

        expect(http.get).toHaveBeenCalledWith('/internal/workplace_search/account/sources/123');
        await promise;
        expect(initializeFederatedSummarySpy).toHaveBeenCalledWith(contentSource.id);
      });

      describe('errors', () => {
        it('handles generic errors', async () => {
          const mockError = Promise.reject('error');
          http.get.mockReturnValue(mockError);

          SourceLogic.actions.initializeSource(contentSource.id);
          await expectedAsyncError(mockError);

          expect(flashAPIErrors).toHaveBeenCalledWith('error');
        });

        it('handles error message with diagnostic bundle error message', async () => {
          const showDiagnosticDownloadButtonSpy = jest.spyOn(
            SourceLogic.actions,
            'showDiagnosticDownloadButton'
          );

          // For contenst source errors, the API returns the source errors in an error property in the success
          // response. We don't reject here because we still render the content source with the error.
          const promise = Promise.resolve({
            ...contentSource,
            errors: [
              'The database is on fire. [Check diagnostic bundle for details - Message id: 123]',
            ],
          });
          http.get.mockReturnValue(promise);
          SourceLogic.actions.initializeSource(contentSource.id);
          await promise;

          expect(showDiagnosticDownloadButtonSpy).toHaveBeenCalled();
        });

        describe('404s', () => {
          const mock404 = Promise.reject({ response: { status: 404 } });

          it('redirects to the organization sources page on organization views', async () => {
            AppLogic.values.isOrganization = true;
            http.get.mockReturnValue(mock404);

            SourceLogic.actions.initializeSource('404ing_org_source');
            await expectedAsyncError(mock404);

            expect(navigateToUrl).toHaveBeenCalledWith('/sources');
            expect(setErrorMessage).toHaveBeenCalledWith('Source not found.');
          });

          it('redirects to the personal dashboard sources page on personal views', async () => {
            AppLogic.values.isOrganization = false;
            http.get.mockReturnValue(mock404);

            SourceLogic.actions.initializeSource('404ing_private_source');
            await expectedAsyncError(mock404);

            expect(navigateToUrl).toHaveBeenCalledWith('/p/sources');
            expect(setErrorMessage).toHaveBeenCalledWith('Source not found.');
          });
        });

        it('renders error messages passed in success response from server', async () => {
          const errors = ['ERROR'];
          const promise = Promise.resolve({
            ...contentSource,
            errors,
          });
          http.get.mockReturnValue(promise);
          SourceLogic.actions.initializeSource(contentSource.id);
          await promise;

          expect(setErrorMessage).toHaveBeenCalledWith(errors);
        });
      });
    });

    describe('initializeFederatedSummary', () => {
      it('calls API and sets values', async () => {
        const onUpdateSummarySpy = jest.spyOn(SourceLogic.actions, 'onUpdateSummary');
        const promise = Promise.resolve(contentSource);
        http.get.mockReturnValue(promise);
        SourceLogic.actions.initializeFederatedSummary(contentSource.id);

        expect(http.get).toHaveBeenCalledWith(
          '/internal/workplace_search/account/sources/123/federated_summary'
        );
        await promise;
        expect(onUpdateSummarySpy).toHaveBeenCalledWith(contentSource.summary);
      });

      itShowsServerErrorAsFlashMessage(http.get, () => {
        SourceLogic.actions.initializeFederatedSummary(contentSource.id);
      });
    });

    describe('searchContentSourceDocuments', () => {
      const mockBreakpoint = jest.fn();
      const values = { contentMeta: meta, contentFilterValue: '' };
      const actions = { setSearchResults: jest.fn() };
      const { searchContentSourceDocuments } = getListeners({
        values,
        actions,
      });

      it('calls API and sets values (org)', async () => {
        AppLogic.values.isOrganization = true;
        const promise = Promise.resolve(searchServerResponse);
        http.post.mockReturnValue(promise);

        await searchContentSourceDocuments({ sourceId: contentSource.id }, mockBreakpoint);
        expect(http.post).toHaveBeenCalledWith(
          '/internal/workplace_search/org/sources/123/documents',
          {
            body: JSON.stringify({ query: '', page: meta.page }),
          }
        );

        await promise;
        expect(actions.setSearchResults).toHaveBeenCalledWith(searchServerResponse);
      });

      it('calls API and sets values (account)', async () => {
        AppLogic.values.isOrganization = false;
        const promise = Promise.resolve(searchServerResponse);
        http.post.mockReturnValue(promise);

        SourceLogic.actions.searchContentSourceDocuments(contentSource.id);
        await searchContentSourceDocuments({ sourceId: contentSource.id }, mockBreakpoint);
        expect(http.post).toHaveBeenCalledWith(
          '/internal/workplace_search/account/sources/123/documents',
          {
            body: JSON.stringify({ query: '', page: meta.page }),
          }
        );

        await promise;
        expect(actions.setSearchResults).toHaveBeenCalledWith(searchServerResponse);
      });

      itShowsServerErrorAsFlashMessage(http.post, () => {
        searchContentSourceDocuments({ sourceId: contentSource.id }, mockBreakpoint);
      });
    });

    describe('updateContentSource', () => {
      it('calls API and sets values (org)', async () => {
        AppLogic.values.isOrganization = true;

        const onUpdateSourceNameSpy = jest.spyOn(SourceLogic.actions, 'onUpdateSourceName');
        const promise = Promise.resolve(contentSource);
        http.patch.mockReturnValue(promise);
        SourceLogic.actions.updateContentSource(contentSource.id, contentSource);

        expect(http.patch).toHaveBeenCalledWith(
          '/internal/workplace_search/org/sources/123/settings',
          {
            body: JSON.stringify({ content_source: contentSource }),
          }
        );
        await promise;
        expect(onUpdateSourceNameSpy).toHaveBeenCalledWith(contentSource.name);
      });

      it('does not call onUpdateSourceName when the name is not supplied', async () => {
        AppLogic.values.isOrganization = true;

        const onUpdateSourceNameSpy = jest.spyOn(SourceLogic.actions, 'onUpdateSourceName');
        const promise = Promise.resolve(contentSource);
        http.patch.mockReturnValue(promise);
        SourceLogic.actions.updateContentSource(contentSource.id, { indexing: { enabled: true } });

        expect(http.patch).toHaveBeenCalledWith(
          '/internal/workplace_search/org/sources/123/settings',
          {
            body: JSON.stringify({ content_source: { indexing: { enabled: true } } }),
          }
        );
        await promise;
        expect(onUpdateSourceNameSpy).not.toHaveBeenCalledWith(contentSource.name);
      });

      it('calls API and sets values (account)', async () => {
        AppLogic.values.isOrganization = false;

        const onUpdateSourceNameSpy = jest.spyOn(SourceLogic.actions, 'onUpdateSourceName');
        const promise = Promise.resolve(contentSource);
        http.patch.mockReturnValue(promise);
        SourceLogic.actions.updateContentSource(contentSource.id, contentSource);

        expect(http.patch).toHaveBeenCalledWith(
          '/internal/workplace_search/account/sources/123/settings',
          {
            body: JSON.stringify({ content_source: contentSource }),
          }
        );
        await promise;
        expect(onUpdateSourceNameSpy).toHaveBeenCalledWith(contentSource.name);
      });

      itShowsServerErrorAsFlashMessage(http.patch, () => {
        SourceLogic.actions.updateContentSource(contentSource.id, contentSource);
      });
    });

    describe('removeContentSource', () => {
      it('calls API and sets values (org)', async () => {
        AppLogic.values.isOrganization = true;

        const setButtonNotLoadingSpy = jest.spyOn(SourceLogic.actions, 'setButtonNotLoading');
        const promise = Promise.resolve(contentSource);
        http.delete.mockReturnValue(promise);
        SourceLogic.actions.removeContentSource(contentSource.id);

        expect(clearFlashMessages).toHaveBeenCalled();
        expect(http.delete).toHaveBeenCalledWith('/internal/workplace_search/org/sources/123');
        await promise;
        expect(flashSuccessToast).toHaveBeenCalled();
        expect(setButtonNotLoadingSpy).toHaveBeenCalled();
      });

      it('calls API and sets values (account)', async () => {
        AppLogic.values.isOrganization = false;

        const setButtonNotLoadingSpy = jest.spyOn(SourceLogic.actions, 'setButtonNotLoading');
        const promise = Promise.resolve(contentSource);
        http.delete.mockReturnValue(promise);
        SourceLogic.actions.removeContentSource(contentSource.id);

        expect(clearFlashMessages).toHaveBeenCalled();
        expect(http.delete).toHaveBeenCalledWith('/internal/workplace_search/account/sources/123');
        await promise;
        expect(setButtonNotLoadingSpy).toHaveBeenCalled();
      });

      itShowsServerErrorAsFlashMessage(http.delete, () => {
        SourceLogic.actions.removeContentSource(contentSource.id);
      });
    });

    describe('initializeSourceSynchronization', () => {
      it('calls API and fetches fresh source state', async () => {
        const initializeSourceSpy = jest.spyOn(SourceLogic.actions, 'initializeSource');
        const promise = Promise.resolve(contentSource);
        http.post.mockReturnValue(promise);
        SourceLogic.actions.initializeSourceSynchronization(contentSource.id);

        expect(http.post).toHaveBeenCalledWith('/internal/workplace_search/org/sources/123/sync');
        await promise;
        expect(initializeSourceSpy).toHaveBeenCalledWith(contentSource.id);
      });

      itShowsServerErrorAsFlashMessage(http.post, () => {
        SourceLogic.actions.initializeSourceSynchronization(contentSource.id);
      });
    });

    it('resetSourceState', () => {
      SourceLogic.actions.resetSourceState();

      expect(clearFlashMessages).toHaveBeenCalled();
    });
  });
});
