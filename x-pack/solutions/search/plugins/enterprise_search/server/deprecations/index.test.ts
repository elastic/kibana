/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CloudSetup } from '@kbn/cloud-plugin/server';

let mockedFetchConnectors = jest.fn();
jest.mock('@kbn/search-connectors', () => {
  return {
    __esModule: true,
    ...jest.requireActual('@kbn/search-connectors'),
    fetchConnectors: () => mockedFetchConnectors(),
  };
});

import { DeprecationDetailsMessage } from '@kbn/core-deprecations-common';
import { GetDeprecationsContext } from '@kbn/core-deprecations-server';

import { Connector } from '@kbn/search-connectors';

import { ConfigType } from '..';

import {
  getCrawlerDeprecations,
  getEnterpriseSearchNodeDeprecation,
  getNativeConnectorDeprecations,
  getEnterpriseSearchAccountCleanups,
} from '.';

let mockedGetUser = jest.fn();
let mockedGetServiceCredentials = jest.fn();
let mockedGetApiKey = jest.fn();
const ctx = {
  esClient: {
    asInternalUser: {},
    asCurrentUser: {
      security: {
        getUser: () => mockedGetUser(),
        getServiceCredentials: (request: any) => mockedGetServiceCredentials(request),
        getApiKey: () => mockedGetApiKey(),
      },
    },
  },
} as GetDeprecationsContext;

const cloud = { baseUrl: 'cloud.elastic.co', deploymentId: '123', cloudId: 'abc' } as CloudSetup;
const notCloud = {} as CloudSetup;
const docsUrl = 'example.com';

describe('Enterprise Search node deprecation', () => {
  it('Tells you to remove capacity if running on cloud', () => {
    const config = { host: 'example.com' } as ConfigType;
    const deprecations = getEnterpriseSearchNodeDeprecation(config, cloud, docsUrl);
    expect(deprecations).toHaveLength(1);
    const steps = deprecations[0].correctiveActions.manualSteps;
    expect(steps).toHaveLength(6);
    const stepsStr = steps.join(', ');
    expect(stepsStr).toMatch('Go to cloud.elastic.co');
    expect(stepsStr).not.toMatch("Edit 'kibana.yml'");
    expect(stepsStr).toMatch('You should no longer see any Enterprise Search capacity');
  });

  it('Tells you to remove the config if running self-managed', () => {
    const config = { host: 'example.com' } as ConfigType;
    const deprecations = getEnterpriseSearchNodeDeprecation(config, notCloud, docsUrl);
    expect(deprecations).toHaveLength(1);
    const steps = deprecations[0].correctiveActions.manualSteps;
    expect(steps).toHaveLength(6);
    const stepsStr = steps.join(', ');
    expect(stepsStr).toMatch("remove 'enterpriseSearch.host'");
    expect(stepsStr).toMatch("remove 'enterpriseSearch.customHeaders'");
    expect(stepsStr).toMatch("remove 'enterpriseSearch.appsDisabled'");
    expect(stepsStr).toMatch('Stop all your Enterprise Search nodes');
  });

  it('Tells you to remove the custom headers config if running self-managed without host', () => {
    const config = { customHeaders: {} } as ConfigType;
    const deprecations = getEnterpriseSearchNodeDeprecation(config, notCloud, docsUrl);
    expect(deprecations).toHaveLength(1);
    const steps = deprecations[0].correctiveActions.manualSteps;
    expect(steps).toHaveLength(6);
    const stepsStr = steps.join(', ');
    expect(stepsStr).toMatch("remove 'enterpriseSearch.host'");
    expect(stepsStr).toMatch("remove 'enterpriseSearch.customHeaders'");
    expect(stepsStr).toMatch("remove 'enterpriseSearch.appsDisabled'");
    expect(stepsStr).toMatch('Stop all your Enterprise Search nodes');
  });

  it('Has no deprecations if Enterprise Search is not there', () => {
    const config = {} as ConfigType;
    const deprecations = getEnterpriseSearchNodeDeprecation(config, cloud, docsUrl);
    expect(deprecations).toHaveLength(0);
  });
});

describe('Crawler connector deprecation', () => {
  it('Has no deprecations if there are no crawler connectors', async () => {
    mockedFetchConnectors = jest.fn().mockResolvedValue([]);
    const deprecations = await getCrawlerDeprecations(ctx, docsUrl);
    expect(deprecations).toHaveLength(0);
  });

  it('Adds a deprecation if there are crawler connectors', async () => {
    const crawlerConnector = {
      id: 'foo',
    } as Connector;
    mockedFetchConnectors = jest.fn().mockResolvedValue([crawlerConnector]);
    const deprecations = await getCrawlerDeprecations(ctx, docsUrl);
    expect(deprecations).toHaveLength(1);
    expect(deprecations[0].correctiveActions.api?.path).toStrictEqual(
      '/internal/enterprise_search/deprecations/delete_crawler_connectors'
    );
    expect(deprecations[0].correctiveActions.api?.body).toStrictEqual({ ids: ['foo'] });
  });
});

describe('Native connector deprecations', () => {
  it('Has no deprecations if there are no native connectors', async () => {
    const connectorClient = {
      id: 'foo',
      is_native: false,
    } as Connector;
    mockedFetchConnectors = jest.fn().mockResolvedValue([connectorClient]);
    const deprecations = await getNativeConnectorDeprecations(ctx, docsUrl);
    expect(deprecations).toHaveLength(0);
  });

  it('Has a deprecation if there are native connectors present', async () => {
    const nativeConnector = {
      id: 'foo',
      is_native: true,
      service_type: 'fake',
    } as Connector;
    mockedFetchConnectors = jest.fn().mockResolvedValue([nativeConnector]);
    const deprecations = await getNativeConnectorDeprecations(ctx, docsUrl);
    expect(deprecations).toHaveLength(1);
    expect(deprecations[0].correctiveActions.api?.path).toStrictEqual(
      '/internal/enterprise_search/deprecations/convert_connectors_to_client'
    );
    expect(deprecations[0].correctiveActions.api?.body).toStrictEqual({ ids: ['foo'] });
    expect(deprecations[0].title).toMatch('Elastic-managed connectors are no longer supported');
  });
});

describe('Enterprise Search service account cleanups', () => {
  it('Should not return any deprecations if Enterprise Search is still active', async () => {
    mockedGetUser = jest.fn().mockResolvedValue(undefined);
    mockedGetServiceCredentials = jest.fn().mockResolvedValue(undefined);
    mockedGetApiKey = jest.fn().mockResolvedValue([]);

    const config = { host: 'example.com' } as ConfigType;
    const deprecations = await getEnterpriseSearchAccountCleanups(ctx, config);
    expect(deprecations).toHaveLength(0);
  });

  it('Should not return any deprecations if no service accounts, tokens, or api keys are present', async () => {
    const config = {} as ConfigType;

    mockedGetUser = jest.fn().mockResolvedValue(undefined);
    mockedGetServiceCredentials = jest.fn().mockResolvedValue(undefined);
    mockedGetApiKey = jest.fn().mockResolvedValue([]);

    const deprecations = await getEnterpriseSearchAccountCleanups(ctx, config);
    expect(deprecations).toHaveLength(0);
  });

  it('Should return a deprecation if service accounts user is present', async () => {
    const config = {} as ConfigType;

    mockedGetUser = jest.fn().mockResolvedValue({
      username: 'enterprise_search',
    });
    mockedGetServiceCredentials = jest.fn().mockResolvedValue(undefined);
    mockedGetApiKey = jest.fn().mockResolvedValue([]);

    const deprecations = await getEnterpriseSearchAccountCleanups(ctx, config);
    expect(deprecations).toHaveLength(1);

    const steps = deprecations[0].correctiveActions.manualSteps;
    expect(steps).toHaveLength(1);
    const stepsStr = steps.join(', ');
    expect(stepsStr).toMatch("Remove the 'enterprise_search' user account");

    expect(deprecations[0].title).toMatch(
      'Enterprise Search user accounts and credentials should be removed'
    );

    const message = deprecations[0].message as DeprecationDetailsMessage;
    expect(message.content).toMatch('There are leftover accounts or credentials');
    expect(message.content).toMatch("Remove the 'enterprise_search' user account");
  });

  it('Should return a deprecation if service account credentials are present', async () => {
    const config = {} as ConfigType;

    mockedGetUser = jest.fn().mockResolvedValue(undefined);
    mockedGetServiceCredentials = jest.fn().mockResolvedValue({
      service_account: 'enterprise_search',
      count: 1,
      tokens: ['tokenid'],
      nodes_credentials: [],
    });
    mockedGetApiKey = jest.fn().mockResolvedValue([]);

    const deprecations = await getEnterpriseSearchAccountCleanups(ctx, config);
    expect(deprecations).toHaveLength(1);

    const steps = deprecations[0].correctiveActions.manualSteps;
    expect(steps).toHaveLength(1);
    const stepsStr = steps.join(', ');
    expect(stepsStr).toMatch("Invalidate the 'elastic/enterprise-search-server' token");

    expect(deprecations[0].title).toMatch(
      'Enterprise Search user accounts and credentials should be removed'
    );

    const message = deprecations[0].message as DeprecationDetailsMessage;
    expect(message.content).toMatch('There are leftover accounts or credentials');
    expect(message.content).toMatch(
      "Invalidate any 'elastic/enterprise-search-server' service account credentials"
    );
  });

  it('Should return a deprecation if service account api keys are present', async () => {
    const config = {} as ConfigType;

    mockedGetUser = jest.fn().mockResolvedValue(undefined);
    mockedGetServiceCredentials = jest.fn().mockResolvedValue(undefined);
    mockedGetApiKey = jest.fn().mockResolvedValue({ api_keys: [{ id: 'test_api_key' }] });

    const deprecations = await getEnterpriseSearchAccountCleanups(ctx, config);
    expect(deprecations).toHaveLength(1);

    const steps = deprecations[0].correctiveActions.manualSteps;
    expect(steps).toHaveLength(1);
    const stepsStr = steps.join(', ');
    expect(stepsStr).toMatch(
      "Invalidate the 'cloud-internal-enterprise_search-server' API key 'test_api_key'"
    );

    expect(deprecations[0].title).toMatch(
      'Enterprise Search user accounts and credentials should be removed'
    );

    const message = deprecations[0].message as DeprecationDetailsMessage;
    expect(message.content).toMatch('There are leftover accounts or credentials');
    expect(message.content).toMatch(
      "Invalidate any 'cloud-internal-enterprise_search-server' API keys"
    );
  });

  it('Should return a deprecation for service account user, credentials, and keys', async () => {
    const config = {} as ConfigType;

    mockedGetUser = jest.fn().mockResolvedValue({
      username: 'enterprise_search',
    });
    mockedGetServiceCredentials = jest.fn().mockResolvedValue({
      service_account: 'enterprise_search',
      count: 1,
      tokens: ['tokenid'],
      nodes_credentials: [],
    });
    mockedGetApiKey = jest.fn().mockResolvedValue({ api_keys: [{ id: 'test_api_key' }] });

    const deprecations = await getEnterpriseSearchAccountCleanups(ctx, config);
    expect(deprecations).toHaveLength(1);

    const steps = deprecations[0].correctiveActions.manualSteps;
    expect(steps).toHaveLength(3);
    const stepsStr = steps.join(', ');
    expect(stepsStr).toMatch("Remove the 'enterprise_search' user account");
    expect(stepsStr).toMatch("Invalidate the 'elastic/enterprise-search-server' token");
    expect(stepsStr).toMatch(
      "Invalidate the 'cloud-internal-enterprise_search-server' API key 'test_api_key'"
    );

    expect(deprecations[0].title).toMatch(
      'Enterprise Search user accounts and credentials should be removed'
    );

    const message = deprecations[0].message as DeprecationDetailsMessage;
    expect(message.content).toMatch('There are leftover accounts or credentials');
    expect(message.content).toMatch("Remove the 'enterprise_search' user account");
    expect(message.content).toMatch(
      "Invalidate any 'elastic/enterprise-search-server' service account credentials"
    );
    expect(message.content).toMatch(
      "Invalidate any 'cloud-internal-enterprise_search-server' API keys"
    );
  });
});
