/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import type { ElasticsearchHomePageProps } from '@kbn/elasticsearch-home/public';
import { useKibana } from './hooks/use_kibana';
import { HomePage } from './home_page';

jest.mock('./hooks/use_kibana', () => ({ useKibana: jest.fn() }));

const mockUseKibana = useKibana as jest.Mock;

describe('HomePage', () => {
  it('renders the shared home page with the vectordb namespaces and docs link', () => {
    const { application, docLinks } = coreMock.createStart();
    const sharedHomePage = jest.fn((_props: ElasticsearchHomePageProps) => null);
    mockUseKibana.mockReturnValue({
      services: { application, docLinks, elasticsearchHome: { HomePage: sharedHomePage } },
    });

    render(<HomePage />);

    expect(sharedHomePage).toHaveBeenCalledTimes(1);
    expect(sharedHomePage.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        telemetryPrefix: 'serverlessVectordb-home',
        storageKeyPrefix: 'vectordb.home',
        docsLink: expect.objectContaining({
          href: docLinks.links.enterpriseSearch.vectorDatabaseFullTextSearch,
        }),
      })
    );
  });
});
