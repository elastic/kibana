/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAllowedWhileGated, needsWayBack } from './allowlist';
import type { GateLocation } from './allowlist';

const at = (appId: string, location: string, appRoute = `/app/${appId}`): GateLocation => ({
  appId,
  isChromeless: false,
  appRoute,
  location,
});

describe('isAllowedWhileGated', () => {
  it.each([
    ['the home', at('searchHomepage', '/app/elasticsearch/home', '/app/elasticsearch/home')],
    [
      'the guided setup',
      at('searchHomepage', '/app/elasticsearch/home/get_started', '/app/elasticsearch/home'),
    ],
    [
      'the web crawls page',
      at('searchHomepage', '/app/elasticsearch/home/web_crawls', '/app/elasticsearch/home'),
    ],
    [
      'getting started',
      at(
        'searchGettingStarted',
        '/app/elasticsearch/getting_started',
        '/app/elasticsearch/getting_started'
      ),
    ],
    [
      'the serverless landing route',
      at('serverlessHomeRedirect', '/app/elasticsearch', '/app/elasticsearch'),
    ],
    ['Integrations', at('integrations', '/app/integrations/browse/observability/message_queue')],
    ['an integration', at('integrations', '/app/integrations/detail/kafka_log-2.1.2/overview')],
    ['Fleet', at('fleet', '/app/fleet/integrations/kafka_log-2.1.2/add-integration')],
    ['the file upload', at('home', '/app/home#/tutorial_directory/fileDataViz')],
    ['the sample data', at('home', '/app/home#/tutorial_directory/sampleData')],
    ['Dev Tools at its root', at('dev_tools', '/app/dev_tools')],
    ['Console', at('dev_tools', '/app/dev_tools#/console')],
    ['Console with a request', at('dev_tools', '/app/dev_tools#/console/shell')],
    ['the index list', at('management', '/app/management/data/index_management/indices')],
    ['an index', at('management', '/app/management/data/index_management/indices/index_details')],
    ['data federation', at('management', '/app/management/data/data_federation')],
    ['API keys', at('management', '/app/management/security/api_keys')],
    [
      'the search index list',
      at(
        'elasticsearchIndexManagement',
        '/app/elasticsearch/index_management/indices',
        '/app/elasticsearch/index_management'
      ),
    ],
    ['the user profile', at('security_account', '/security/account', '/security/account')],
  ])('allows %s', (_, location) => {
    expect(isAllowedWhileGated(location)).toBe(true);
  });

  it.each([
    ['Discover', at('discover', '/app/discover')],
    ['Dashboards', at('dashboards', '/app/dashboards#/list')],
    ['Agents', at('agent_builder', '/app/agent_builder')],
    ['the Kibana home', at('home', '/app/home')],
    ['the Kibana home at its hash root', at('home', '/app/home#/')],
    ['the tutorial directory', at('home', '/app/home#/tutorial_directory')],
    ['another tutorial tab', at('home', '/app/home#/tutorial_directory/sampleDataExtra')],
    ['a tutorial', at('home', '/app/home#/tutorial/apm')],
    ['another dev tool', at('dev_tools', '/app/dev_tools#/searchprofiler')],
    ['Stack Management', at('management', '/app/management')],
    ['ingest pipelines', at('management', '/app/management/ingest/ingest_pipelines')],
    ['data views', at('management', '/app/management/kibana/dataViews')],
    ['a lookalike section', at('management', '/app/management/data/index_management_extra')],
    ['users', at('management', '/app/management/security/users')],
    ['an inherited property name', at('constructor', '/app/constructor')],
  ])('turns away %s', (_, location) => {
    expect(isAllowedWhileGated(location)).toBe(false);
  });

  it('allows pages without an app, such as application not found', () => {
    expect(
      isAllowedWhileGated({
        appId: undefined,
        isChromeless: false,
        appRoute: undefined,
        location: '/app/nope',
      })
    ).toBe(true);
  });

  it('allows chromeless apps such as login, logout, the space selector and error pages', () => {
    expect(
      isAllowedWhileGated({ ...at('space_selector', '/spaces/space_selector'), isChromeless: true })
    ).toBe(true);
  });

  it('waits for the location when the app has changed ahead of it', () => {
    expect(isAllowedWhileGated(at('home', '/app/elasticsearch/home'))).toBe(true);
    expect(isAllowedWhileGated(at('home', '/app/homepage'))).toBe(true);
    expect(isAllowedWhileGated(at('discover', '/app/integrations/browse'))).toBe(true);
  });
});

describe('needsWayBack', () => {
  it.each([
    ['Integrations', at('integrations', '/app/integrations/browse')],
    ['Fleet', at('fleet', '/app/fleet/agents')],
    ['the file upload', at('home', '/app/home#/tutorial_directory/fileDataViz')],
  ])('offers the way back on %s', (_, location) => {
    expect(needsWayBack(location)).toBe(true);
  });

  it.each([
    ['the home', at('searchHomepage', '/app/elasticsearch/home', '/app/elasticsearch/home')],
    [
      'the guided setup',
      at('searchHomepage', '/app/elasticsearch/home/get_started', '/app/elasticsearch/home'),
    ],
    [
      'the web crawls page, which has its own',
      at('searchHomepage', '/app/elasticsearch/home/web_crawls', '/app/elasticsearch/home'),
    ],
    [
      'getting started, which has its own',
      at(
        'searchGettingStarted',
        '/app/elasticsearch/getting_started',
        '/app/elasticsearch/getting_started'
      ),
    ],
    [
      'the serverless landing route, which leads to the home',
      at('serverlessHomeRedirect', '/app/elasticsearch', '/app/elasticsearch'),
    ],
    ['a chromeless app', { ...at('security_login', '/login', '/login'), isChromeless: true }],
    [
      'a page without an app',
      { appId: undefined, isChromeless: false, appRoute: undefined, location: '/app/nope' },
    ],
  ])('offers none on %s', (_, location) => {
    expect(needsWayBack(location)).toBe(false);
  });
});
