/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useLocation } from 'react-router-dom';
import { render, core } from '../../test/test_utils';
import { ElasticsearchOverview as Overview } from './overview';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: jest.fn(),
}));

describe('<Overview />', () => {
  beforeEach(() => {
    core.http.fetch.mockImplementation((url) => {
      let fetchedUrl: string;
      if (typeof url === 'string') {
        fetchedUrl = url;
      }

      return new Promise((resolve, reject) => {
        switch (fetchedUrl) {
          case '/internal/serverless_search/api_keys':
            resolve({ apiKeys: [] });
            return;
          case '/internal/serverless_search/connectors':
            resolve({});
            return;
          case '/internal/serverless_search/ingest_pipelines':
            resolve({ pipelines: [] });
            return;
          default:
            return reject(`unknown path requested ${fetchedUrl}`);
        }
      });
    });
    const pathname = '/app/elasticsearch';
    (useLocation as jest.Mock).mockImplementation(() => ({
      pathname,
    }));
  });

  test('renders without throwing an error', () => {
    const wrapper = render(<Overview />);
    expect(wrapper).toBeDefined();
  });

  test('getting started', () => {
    const { getByRole } = render(<Overview />);
    expect(getByRole('heading', { name: 'Get started with Elasticsearch' })).toBeDefined();
  });

  test('select client', () => {
    const { getByRole } = render(<Overview />);
    expect(getByRole('heading', { name: 'Select your client' })).toBeDefined();
  });
  test('install client', () => {
    const { getByRole } = render(<Overview />);
    expect(getByRole('heading', { name: 'Install a client' })).toBeDefined();
  });
  test('api key', () => {
    const { getByRole } = render(<Overview />);
    expect(getByRole('heading', { level: 2, name: 'API Key' })).toBeDefined();
  });
  test('cloud id', () => {
    const { getByRole } = render(<Overview />);
    expect(getByRole('heading', { name: 'Copy your connection details' })).toBeDefined();
  });
  test('configure client', () => {
    const { getByRole } = render(<Overview />);
    expect(getByRole('heading', { name: 'Configure your client' })).toBeDefined();
  });
  test('test connection', () => {
    const { getByRole } = render(<Overview />);
    expect(getByRole('heading', { name: 'Test your connection' })).toBeDefined();
  });
  test('ingest data', () => {
    const { getByRole } = render(<Overview />);
    expect(getByRole('heading', { name: 'Ingest data' })).toBeDefined();
  });
  test('build query', () => {
    const { getByRole } = render(<Overview />);
    expect(getByRole('heading', { name: 'Build your first search query' })).toBeDefined();
  });
  test('preprocess data', () => {
    const { getByRole } = render(<Overview />);
    expect(
      getByRole('heading', {
        name: 'Preprocess your data by enriching, transforming or filtering with pipelines',
      })
    ).toBeDefined();
  });
  test("what's next?", () => {
    const { getByRole } = render(<Overview />);
    expect(getByRole('heading', { name: 'Do more with your data' })).toBeDefined();
  });
});
