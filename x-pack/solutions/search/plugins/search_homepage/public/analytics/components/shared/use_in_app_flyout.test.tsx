/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiThemeProvider } from '@elastic/eui';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useKibana } from '../../../hooks/use_kibana';
import { ExplorePanel } from './explore_panel';
import type { AnalyticsEventSource } from '../../types';
import { EVENT_SOURCE, createLinksMock } from './test_helpers';

jest.mock('../../../hooks/use_kibana', () => ({ useKibana: jest.fn() }));
jest.mock('../../hooks/use_elasticsearch_url', () => ({
  useElasticsearchUrl: () => 'https://my-project.es.example.com',
}));

const mockUseKibana = useKibana as jest.Mock;

const PATH = '/internal/search_homepage/analytics/app_api_key';
const FLYOUT = 'analyticsUseInAppFlyout';
const CREATE = 'analyticsUseInAppCreateKey';
const NOTE = 'analyticsUseInAppKeyNote';
const CODE = 'searchHomepageAnalyticsUseInAppCode';
const ENCODED = 'a2V5LWlkOnNlY3JldA==';

describe('Use in your app', () => {
  let get: jest.Mock;
  let post: jest.Mock;
  let links: ReturnType<typeof createLinksMock>;

  const setup = async ({
    isServerless = false,
    source = EVENT_SOURCE,
  }: { isServerless?: boolean; source?: AnalyticsEventSource } = {}) => {
    mockUseKibana.mockReturnValue({
      services: { http: { get, post }, cloud: { isServerlessEnabled: isServerless } },
    });
    links = createLinksMock();
    render(
      <EuiThemeProvider>
        <ExplorePanel
          page="home"
          headingElement="h2"
          sources={[source]}
          totalSources={1}
          selectedSource={source}
          onSelectSource={jest.fn()}
          showAgentEntry={false}
          links={links}
        />
      </EuiThemeProvider>
    );
    const opener = screen.getByRole('button', { name: /^Use in your app: / });
    await act(async () => {
      fireEvent.click(opener);
    });

    return { opener };
  };

  const createKey = async (): Promise<void> => {
    await act(async () => {
      fireEvent.click(screen.getByTestId(CREATE));
    });
  };

  const refuse = (status: number, reason?: string) =>
    Object.assign(new Error('refused'), {
      response: { status },
      body: { message: 'refused', attributes: reason === undefined ? undefined : { reason } },
    });

  beforeEach(() => {
    get = jest.fn().mockResolvedValue({ canCreate: true });
    post = jest.fn().mockResolvedValue({
      id: 'key-id',
      name: 'analytics-app-read-clickstream-events',
      encoded: ENCODED,
    });
    sessionStorage.clear();
    localStorage.clear();
  });

  it('adds one secondary action to the expanded query and none to the collapsed ones', async () => {
    await setup();

    expect(
      screen.getAllByRole('button', { name: /^Use in your app: /, hidden: true })
    ).toHaveLength(1);
    expect(
      screen.getAllByRole('button', { name: /^Open in Discover: /, hidden: true })[0]
    ).toHaveClass('euiButton');
  });

  it('opens a named dialog for the query without leaving the page', async () => {
    await setup();

    expect(screen.getByRole('dialog')).toBe(screen.getByTestId(FLYOUT));
    expect(screen.getByRole('heading', { level: 2, name: 'Use in your app' })).toBeVisible();
    expect(screen.getByTestId('analyticsUseInAppQuestion').textContent).not.toBe('');
    expect(links.openDiscover).not.toHaveBeenCalled();
  });

  it('shows the request as curl first, with the endpoint and a placeholder key', async () => {
    await setup();

    const code = screen.getByTestId(CODE);
    expect(code).toHaveTextContent(`curl -X POST 'https://my-project.es.example.com/_query'`);
    expect(code).toHaveTextContent('Authorization: ApiKey YOUR_API_KEY');
    expect(code).toHaveTextContent('FROM clickstream-events');
  });

  it('switches to the JavaScript and Python clients', async () => {
    await setup({ isServerless: true });

    fireEvent.click(screen.getByTestId('searchHomepageAnalyticsUseInAppLanguage-javascript'));
    expect(screen.getByTestId(CODE)).toHaveTextContent('await client.esql.query({');
    expect(screen.getByTestId(CODE)).toHaveTextContent(`serverMode: 'serverless'`);

    fireEvent.click(screen.getByTestId('searchHomepageAnalyticsUseInAppLanguage-python'));
    expect(screen.getByTestId(CODE)).toHaveTextContent('client.esql.query(');
    expect(screen.getByTestId(CODE)).toHaveTextContent('api_key="YOUR_API_KEY"');
  });

  it('limits the request to the 7 days the query is opened with in Discover', async () => {
    await setup();

    expect(screen.getByTestId(CODE)).toHaveTextContent(
      '"filter": { "range": { "@timestamp": { "gte": "now-7d", "lte": "now" } } }'
    );

    fireEvent.click(screen.getByTestId('searchHomepageAnalyticsUseInAppLanguage-javascript'));
    expect(screen.getByTestId(CODE)).toHaveTextContent(
      `filter: { range: { '@timestamp': { gte: 'now-7d', lte: 'now' } } },`
    );

    fireEvent.click(screen.getByTestId('searchHomepageAnalyticsUseInAppLanguage-python'));
    expect(screen.getByTestId(CODE)).toHaveTextContent(
      'filter={"range": {"@timestamp": {"gte": "now-7d", "lte": "now"}}},'
    );
  });

  it.each([
    ['has no time field', null],
    ['has another time field, which Discover does not filter on', 'timestamp'],
  ])('sends the bare query when the source %s', async (_, timeField) => {
    await setup({ source: { ...EVENT_SOURCE, timeField } });

    for (const language of ['curl', 'javascript', 'python']) {
      fireEvent.click(screen.getByTestId(`searchHomepageAnalyticsUseInAppLanguage-${language}`));
      expect(screen.getByTestId(CODE)).toHaveTextContent('FROM clickstream-events');
      expect(screen.getByTestId(CODE)).not.toHaveTextContent('filter');
    }
  });

  it('asks whether a key can be created for the source and says what the key may do', async () => {
    await setup();

    expect(get).toHaveBeenCalledWith(PATH, { query: { index: 'clickstream-events' } });
    expect(screen.getByTestId(CREATE)).toBeEnabled();
    expect(screen.getByTestId(NOTE)).toHaveTextContent('The key can only read clickstream-events.');
    expect(post).not.toHaveBeenCalled();
  });

  it.each([
    ['apiKeysDisabled', 'API keys are turned off in Elasticsearch.'],
    ['missingApiKeyPrivilege', 'Your role needs the manage_own_api_key cluster privilege.'],
    ['missingReadPrivilege', 'Your role needs the read privilege on clickstream-events.'],
    ['sourceNotFound', 'clickstream-events no longer exists.'],
  ])('disables the button with the reason %s and keeps the snippets', async (reason, message) => {
    get.mockResolvedValue({ canCreate: false, reason });
    await setup();

    expect(screen.getByTestId(CREATE)).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByTestId(NOTE)).toHaveTextContent(message);
    expect(screen.getByTestId(CODE)).toHaveTextContent('Authorization: ApiKey YOUR_API_KEY');

    await createKey();
    expect(post).not.toHaveBeenCalled();
  });

  it('leaves the button usable when the check itself fails', async () => {
    get.mockRejectedValue(new Error('offline'));
    await setup();

    expect(screen.getByTestId(CREATE)).toBeEnabled();
  });

  it('creates the key, shows it with its scope and puts it in every snippet', async () => {
    await setup();
    await createKey();

    expect(post).toHaveBeenCalledWith(PATH, {
      body: JSON.stringify({ index: 'clickstream-events' }),
    });
    const key = screen.getByTestId('analyticsUseInAppKey');
    expect(key).toHaveTextContent(ENCODED);
    expect(key).toHaveTextContent('analytics-app-read-clickstream-events');
    expect(key).toHaveTextContent('The key can only read clickstream-events.');
    expect(key).toHaveTextContent('It is not shown again.');
    expect(key).toHaveFocus();
    expect(screen.getByTestId('analyticsUseInAppCopyKey')).toBeInTheDocument();
    expect(screen.queryByTestId(CREATE)).not.toBeInTheDocument();

    expect(screen.getByTestId(CODE)).toHaveTextContent(`Authorization: ApiKey ${ENCODED}`);
    fireEvent.click(screen.getByTestId('searchHomepageAnalyticsUseInAppLanguage-javascript'));
    expect(screen.getByTestId(CODE)).toHaveTextContent(`auth: { apiKey: '${ENCODED}' }`);
    fireEvent.click(screen.getByTestId('searchHomepageAnalyticsUseInAppLanguage-python'));
    expect(screen.getByTestId(CODE)).toHaveTextContent(`api_key="${ENCODED}"`);
  });

  it('keeps the key out of browser storage', async () => {
    await setup();
    await createKey();

    expect(JSON.stringify({ ...localStorage })).not.toContain(ENCODED);
    expect(JSON.stringify({ ...sessionStorage })).not.toContain(ENCODED);
  });

  it('uses the same key for another query of the source while the page stays open', async () => {
    await setup();
    await createKey();
    fireEvent.click(screen.getByTestId('analyticsUseInAppFlyoutClose'));

    const [otherQuery] = screen.getAllByTestId(/^analyticsHomeQueryToggle-/);
    const otherQuestion = otherQuery.textContent ?? '';
    fireEvent.click(otherQuery);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^Use in your app: / }));
    });

    expect(screen.getByTestId(CODE)).toHaveTextContent(`Authorization: ApiKey ${ENCODED}`);
    expect(otherQuestion).not.toBe('');
    expect(screen.getByTestId('analyticsUseInAppQuestion')).toHaveTextContent(otherQuestion);
    expect(screen.getByTestId('analyticsUseInAppKey')).not.toHaveFocus();
    expect(post).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('disables the button with the reason when Elasticsearch refuses to create the key', async () => {
    post.mockRejectedValue(refuse(403, 'missingApiKeyPrivilege'));
    await setup();
    await createKey();

    expect(screen.getByTestId(CREATE)).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByTestId(NOTE)).toHaveTextContent(
      'Your role needs the manage_own_api_key cluster privilege.'
    );
    expect(screen.getByTestId(CODE)).toHaveTextContent('YOUR_API_KEY');
  });

  it('reports any other failure and lets the user try again', async () => {
    post.mockRejectedValueOnce(refuse(503));
    await setup();
    await createKey();

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The API key could not be created. Try again.'
    );
    expect(screen.getByTestId(CREATE)).toBeEnabled();

    await createKey();
    expect(screen.getByTestId('analyticsUseInAppKey')).toHaveTextContent(ENCODED);
  });

  it('gives the focus back to the action that opened it', async () => {
    const { opener } = await setup();

    fireEvent.click(screen.getByTestId('analyticsUseInAppFlyoutClose'));

    await waitFor(() => expect(screen.queryByTestId(FLYOUT)).not.toBeInTheDocument());
    expect(opener).toHaveFocus();
  });
});
