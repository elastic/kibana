/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setNotebookParameter, removeNotebookParameter } from './notebook_query_param';

const baseMockWindow = () => {
  return {
    history: {
      pushState: jest.fn(),
    },
    location: {
      host: 'my-kibana.elastic.co',
      pathname: '',
      protocol: 'https:',
      search: '',
      hash: '',
    },
  };
};
let windowSpy: jest.SpyInstance;
let mockWindow = baseMockWindow();

describe('notebook query parameter utility', () => {
  beforeEach(() => {
    mockWindow = baseMockWindow();
    windowSpy = jest.spyOn(globalThis, 'window', 'get');
    windowSpy.mockImplementation(() => mockWindow);
  });

  afterEach(() => {
    windowSpy.mockRestore();
  });

  describe('setNotebookParameter', () => {
    it('adds notebookId query param', () => {
      mockWindow.location = {
        ...mockWindow.location,
        pathname: '/foo/app/elasticsearch',
      };
      const notebook = '00_quick_start';
      const expectedUrl =
        'https://my-kibana.elastic.co/foo/app/elasticsearch?notebookId=AzD6EcFcEsGMGtQGcAuBDATioA';

      setNotebookParameter(notebook);
      expect(mockWindow.history.pushState).toHaveBeenCalledTimes(1);
      expect(mockWindow.history.pushState).toHaveBeenCalledWith(
        {
          path: expectedUrl,
        },
        '',
        expectedUrl
      );
    });
    it('can replace an existing value', () => {
      mockWindow.location = {
        ...mockWindow.location,
        pathname: '/foo/app/elasticsearch',
        search: '?notebookId=AwRg+g1gpgng7gewE4BMwEcCuUkwJYB2A5mAGZ4A2ALjoUUA',
      };
      const notebook = '00_quick_start';
      const expectedUrl =
        'https://my-kibana.elastic.co/foo/app/elasticsearch?notebookId=AzD6EcFcEsGMGtQGcAuBDATioA';

      setNotebookParameter(notebook);
      expect(mockWindow.history.pushState).toHaveBeenCalledTimes(1);
      expect(mockWindow.history.pushState).toHaveBeenCalledWith(
        {
          path: expectedUrl,
        },
        '',
        expectedUrl
      );
    });
    it('leaves other query parameters in place', () => {
      mockWindow.location = {
        ...mockWindow.location,
        pathname: '/foo/app/elasticsearch',
        search: '?foo=bar',
      };
      const notebook = '00_quick_start';
      const expectedUrl =
        'https://my-kibana.elastic.co/foo/app/elasticsearch?foo=bar&notebookId=AzD6EcFcEsGMGtQGcAuBDATioA';

      setNotebookParameter(notebook);
      expect(mockWindow.history.pushState).toHaveBeenCalledTimes(1);
      expect(mockWindow.history.pushState).toHaveBeenCalledWith(
        {
          path: expectedUrl,
        },
        '',
        expectedUrl
      );
    });
    it('works with hash routes', () => {
      mockWindow.location = {
        ...mockWindow.location,
        pathname: '/foo/app/elasticsearch',
        hash: '#/home',
      };
      const notebook = '00_quick_start';
      const expectedUrl =
        'https://my-kibana.elastic.co/foo/app/elasticsearch#/home?notebookId=AzD6EcFcEsGMGtQGcAuBDATioA';

      setNotebookParameter(notebook);
      expect(mockWindow.history.pushState).toHaveBeenCalledTimes(1);
      expect(mockWindow.history.pushState).toHaveBeenCalledWith(
        {
          path: expectedUrl,
        },
        '',
        expectedUrl
      );
    });
  });
  describe('removeNotebookParameter', () => {
    it('leaves other params in place', () => {
      mockWindow.location = {
        ...mockWindow.location,
        pathname: '/foo/app/elasticsearch',
        search: `?foo=bar&notebookId=AzD6EcFcEsGMGtQGcAuBDATioA`,
      };

      const expectedUrl = 'https://my-kibana.elastic.co/foo/app/elasticsearch?foo=bar';

      removeNotebookParameter();
      expect(mockWindow.history.pushState).toHaveBeenCalledTimes(1);
      expect(mockWindow.history.pushState).toHaveBeenCalledWith(
        {
          path: expectedUrl,
        },
        '',
        expectedUrl
      );
    });
    it('leaves other params with a hashroute', () => {
      mockWindow.location = {
        ...mockWindow.location,
        pathname: '/foo/app/elasticsearch',
        hash: `#/home?foo=bar&notebookId=AzD6EcFcEsGMGtQGcAuBDATioA`,
      };

      const expectedUrl = 'https://my-kibana.elastic.co/foo/app/elasticsearch#/home?foo=bar';

      removeNotebookParameter();
      expect(mockWindow.history.pushState).toHaveBeenCalledTimes(1);
      expect(mockWindow.history.pushState).toHaveBeenCalledWith(
        {
          path: expectedUrl,
        },
        '',
        expectedUrl
      );
    });
    it('removes ? if load_from was the only param', () => {
      mockWindow.location = {
        ...mockWindow.location,
        pathname: '/foo/app/elasticsearch',
        search: `?notebookId=AzD6EcFcEsGMGtQGcAuBDATioA`,
      };

      const expectedUrl = 'https://my-kibana.elastic.co/foo/app/elasticsearch';

      removeNotebookParameter();
      expect(mockWindow.history.pushState).toHaveBeenCalledTimes(1);
      expect(mockWindow.history.pushState).toHaveBeenCalledWith(
        {
          path: expectedUrl,
        },
        '',
        expectedUrl
      );
    });
    it('removes ? if load_from was the only param in a hashroute', () => {
      mockWindow.location = {
        ...mockWindow.location,
        pathname: '/foo/app/elasticsearch',
        hash: '#/home?notebookId=AzD6EcFcEsGMGtQGcAuBDATioA',
      };

      const expectedUrl = 'https://my-kibana.elastic.co/foo/app/elasticsearch#/home';

      removeNotebookParameter();
      expect(mockWindow.history.pushState).toHaveBeenCalledTimes(1);
      expect(mockWindow.history.pushState).toHaveBeenCalledWith(
        {
          path: expectedUrl,
        },
        '',
        expectedUrl
      );
    });
    it('noop if load_from not currently defined on QS', () => {
      mockWindow.location = {
        ...mockWindow.location,
        pathname: '/foo/app/elasticsearch',
        hash: `#/home?foo=bar`,
      };

      removeNotebookParameter();
      expect(mockWindow.history.pushState).not.toHaveBeenCalled();
    });
  });
});
