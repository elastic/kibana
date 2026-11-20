/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { createMemoryHistory } from 'history';
import { EuiThemeProvider } from '@elastic/eui';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Router } from '@kbn/shared-ux-router';
import { useSearchApiKey } from '@kbn/search-api-keys-components';
import { useKibana } from '../../../hooks/use_kibana';
import { EventsIndexFlyoutProvider } from './events_index_flyout';
import type { EventsIndexFlyoutApi } from './events_index_flyout_context';
import { useEventsIndexFlyout } from './events_index_flyout_context';

jest.mock('../../../hooks/use_kibana', () => ({ useKibana: jest.fn() }));
jest.mock('./connection_details', () => ({
  ConnectionDetails: ({ placement }: { placement?: string }) => (
    <div data-test-subj="connectionDetailsStub">{placement}</div>
  ),
}));

jest.mock('../../hooks/use_elasticsearch_url', () => ({
  useElasticsearchUrl: () => 'https://my-project.es.example.com',
}));
jest.mock('@kbn/search-api-keys-components', () => ({
  Status: { showHiddenKey: 'showHiddenKey', showPreviewKey: 'showPreviewKey' },
  useSearchApiKey: jest.fn(),
}));

const mockUseKibana = useKibana as jest.Mock;
const mockUseSearchApiKey = useSearchApiKey as jest.Mock;

const FLYOUT = 'analyticsEventsIndexFlyout';
const NAME = 'analyticsEventsIndexName';
const CREATE = 'analyticsEventsIndexCreate';
const PATH = '/internal/search_homepage/analytics/events_index';

describe('EventsIndexFlyoutProvider', () => {
  let flyout: EventsIndexFlyoutApi;
  let post: jest.Mock;
  let openEmbeddedConsole: jest.Mock;

  /** A page whose opener can be taken away, as when the arrival of data replaces the gate. */
  const Harness = () => {
    flyout = useEventsIndexFlyout();
    const [hasOpener, setHasOpener] = useState(true);

    return (
      <>
        {hasOpener && (
          <button
            data-test-subj="opener"
            onClick={({ currentTarget }) => flyout.open(currentTarget)}
          >
            Create an events index
          </button>
        )}
        <button data-test-subj="replacePage" onClick={() => setHasOpener(false)}>
          Replace the page
        </button>
      </>
    );
  };

  const setup = ({
    hasEmbeddedConsole = true,
    isServerless = false,
  }: { hasEmbeddedConsole?: boolean; isServerless?: boolean } = {}) => {
    const history = createMemoryHistory({ initialEntries: ['/'] });
    mockUseKibana.mockReturnValue({
      services: {
        http: { post },
        cloud: { isServerlessEnabled: isServerless },
        console: { openEmbeddedConsole, isEmbeddedConsoleAvailable: () => hasEmbeddedConsole },
      },
    });
    render(
      <EuiThemeProvider>
        <Router history={history}>
          <EventsIndexFlyoutProvider>
            <Harness />
          </EventsIndexFlyoutProvider>
        </Router>
      </EuiThemeProvider>
    );
    fireEvent.click(screen.getByTestId('opener'));

    return { history, opener: screen.getByTestId('opener') };
  };

  const setName = (name: string): void => {
    fireEvent.change(screen.getByTestId(NAME), { target: { value: name } });
  };

  const create = async (): Promise<void> => {
    await act(async () => {
      fireEvent.submit(screen.getByTestId(NAME));
    });
  };

  beforeEach(() => {
    post = jest.fn().mockImplementation(async (_, { body }) => ({ index: JSON.parse(body).name }));
    openEmbeddedConsole = jest.fn();
    mockUseSearchApiKey.mockReturnValue({ apiKey: null, status: 'showCreateButton' });
  });

  it('is unavailable outside the provider', () => {
    const Probe = () => <>{String(useEventsIndexFlyout().isAvailable)}</>;
    const { container } = render(<Probe />);

    expect(container).toHaveTextContent('false');
  });

  it('opens a named dialog with a default index name', () => {
    setup();

    expect(flyout.isAvailable).toBe(true);
    expect(screen.getByRole('dialog')).toBe(screen.getByTestId(FLYOUT));
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Send events with the API');
    expect(screen.getByLabelText('Index name')).toHaveValue('events');
    expect(screen.getByTestId(FLYOUT)).toHaveTextContent('columnar mode');
  });

  it('creates the index and shows how to send events to it', async () => {
    setup();
    setName('app-events');

    await create();

    expect(post).toHaveBeenCalledWith(PATH, { body: JSON.stringify({ name: 'app-events' }) });
    expect(screen.getByTestId('analyticsEventsIndexCreated')).toHaveTextContent(
      'Index app-events created'
    );
    expect(screen.getByTestId('connectionDetailsStub')).toHaveTextContent('EventsIndex');
    expect(screen.getByTestId('analyticsEventsIndexCode')).toHaveTextContent(
      "curl -X POST 'https://my-project.es.example.com/app-events/_bulk'"
    );
    expect(screen.queryByTestId(NAME)).not.toBeInTheDocument();
    expect(screen.queryByTestId(CREATE)).not.toBeInTheDocument();
  });

  it('shows the code in the chosen language', async () => {
    setup({ isServerless: true });
    await create();
    const getCode = (): HTMLElement => screen.getByTestId('analyticsEventsIndexCode');

    expect(screen.getByRole('group', { name: 'Language' })).toBeInTheDocument();
    expect(
      ['curl', 'javascript', 'python'].map(
        (id) => screen.getByTestId(`analyticsEventsIndexLanguage-${id}`).textContent
      )
    ).toEqual(['cURL', 'JavaScript', 'Python']);

    fireEvent.click(screen.getByTestId('analyticsEventsIndexLanguage-javascript'));

    expect(getCode()).toHaveTextContent("import { Client } from '@elastic/elasticsearch'");
    expect(getCode()).toHaveTextContent('node: "https://my-project.es.example.com"');
    expect(getCode()).toHaveTextContent("serverMode: 'serverless'");
    expect(getCode()).toHaveTextContent('_index: "events"');

    fireEvent.click(screen.getByTestId('analyticsEventsIndexLanguage-python'));

    expect(getCode()).toHaveTextContent('from elasticsearch import Elasticsearch, helpers');
    expect(getCode()).toHaveTextContent('index="events"');
  });

  it('keeps a hidden API key out of the code', async () => {
    mockUseSearchApiKey.mockReturnValue({ apiKey: 'c2VjcmV0', status: 'showHiddenKey' });
    setup();
    await create();

    expect(screen.getByTestId(FLYOUT)).not.toHaveTextContent('c2VjcmV0');
    expect(screen.getByTestId('analyticsEventsIndexCode')).toHaveTextContent(
      'Authorization: ApiKey YOUR_API_KEY'
    );
  });

  it('writes the API key into the code while the user has it revealed', async () => {
    mockUseSearchApiKey.mockReturnValue({ apiKey: 'c2VjcmV0', status: 'showPreviewKey' });
    setup();
    await create();

    expect(screen.getByTestId('analyticsEventsIndexCode')).toHaveTextContent(
      'Authorization: ApiKey c2VjcmV0'
    );
  });

  it('closes and opens the request in Console', async () => {
    setup();
    await create();

    fireEvent.click(screen.getByTestId('analyticsEventsIndexOpenConsole'));

    expect(openEmbeddedConsole).toHaveBeenCalledWith(
      expect.stringMatching(/^POST events\/_bulk\n/)
    );
    expect(screen.queryByTestId(FLYOUT)).not.toBeInTheDocument();
  });

  it('offers no Console where the embedded Console is not available', async () => {
    setup({ hasEmbeddedConsole: false });
    await create();

    expect(screen.getByTestId('analyticsEventsIndexCode')).toBeInTheDocument();
    expect(screen.queryByTestId('analyticsEventsIndexOpenConsole')).not.toBeInTheDocument();
  });

  it.each([
    ['Events', 'Use lowercase letters only.'],
    ['my events', 'Remove spaces and these characters: \\ / * ? " < > | , # :'],
    ['_events', 'Start the name with a letter or a number.'],
  ])('names what is wrong with %j and sends nothing', async (name, message) => {
    setup();
    setName(name);

    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.getByTestId(NAME)).toBeInvalid();

    await create();

    expect(post).not.toHaveBeenCalled();
  });

  it('asks for a name only once the user tries to create the index', async () => {
    setup();
    setName('');

    expect(screen.queryByText('Enter an index name.')).not.toBeInTheDocument();

    await create();

    expect(screen.getByText('Enter an index name.')).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it.each([
    [409, undefined, 'An index named events already exists.'],
    [403, undefined, 'Your role needs the create_index privilege on events.'],
    [
      400,
      'already exists as alias',
      'Elasticsearch did not accept the index: already exists as alias',
    ],
    [500, undefined, 'The index could not be created. Try again.'],
  ])('explains a %i answer and keeps the form', async (status, message, shown) => {
    post.mockRejectedValue({ response: { status }, body: { message } });
    setup();

    await create();

    expect(screen.getByText(shown)).toBeInTheDocument();
    expect(screen.getByTestId(NAME)).toBeInvalid();
    expect(screen.queryByTestId('analyticsEventsIndexCreated')).not.toBeInTheDocument();

    setName('other-events');

    expect(screen.queryByText(shown)).not.toBeInTheDocument();
  });

  it('returns the focus to the opener on close', async () => {
    const { opener } = setup();

    fireEvent.click(screen.getByTestId('analyticsEventsIndexFlyoutClose'));

    await waitFor(() => expect(screen.queryByTestId(FLYOUT)).not.toBeInTheDocument());
    expect(opener).toHaveFocus();
  });

  it('stays open with the request when the page underneath is replaced', async () => {
    setup();
    await create();

    fireEvent.click(screen.getByTestId('replacePage'));

    expect(screen.getByTestId('analyticsEventsIndexCode')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('analyticsEventsIndexFlyoutClose'));
    expect(screen.queryByTestId(FLYOUT)).not.toBeInTheDocument();
  });

  it('closes on a route change', () => {
    const { history } = setup();

    act(() => history.push('/get_started'));

    expect(screen.queryByTestId(FLYOUT)).not.toBeInTheDocument();
  });

  it('starts from an empty form when opened again', async () => {
    setup();
    await create();
    fireEvent.click(screen.getByTestId('analyticsEventsIndexFlyoutClose'));

    fireEvent.click(screen.getByTestId('opener'));

    expect(screen.getByTestId(NAME)).toHaveValue('events');
  });
});
