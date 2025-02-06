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
import { GetDeprecationsContext } from '@kbn/core-deprecations-server';

import { Connector } from '@kbn/search-connectors';

import { ConfigType } from '..';

import {
  getCrawlerDeprecations,
  getEnterpriseSearchNodeDeprecation,
  getNativeConnectorDeprecations,
} from '.';

const ctx = {
  esClient: {
    asInternalUser: {},
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
    expect(stepsStr).toMatch('You should no longer see any Enterprise Search capacity');
  });

  it('Tells you to remove the config if running self-managed', () => {
    const config = { host: 'example.com' } as ConfigType;
    const deprecations = getEnterpriseSearchNodeDeprecation(config, notCloud, docsUrl);
    expect(deprecations).toHaveLength(1);
    const steps = deprecations[0].correctiveActions.manualSteps;
    expect(steps).toHaveLength(4);
    const stepsStr = steps.join(', ');
    expect(stepsStr).toMatch("remove 'enterpriseSearch.host'");
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
    const deprecations = await getNativeConnectorDeprecations(ctx, true, true, cloud, docsUrl);
    expect(deprecations).toHaveLength(0);
  });

  it('Has a deprecation if there are native connectors with illegal service types', async () => {
    const nativeConnector = {
      id: 'foo',
      is_native: true,
      service_type: 'fake',
    } as Connector;
    mockedFetchConnectors = jest.fn().mockResolvedValue([nativeConnector]);
    const deprecations = await getNativeConnectorDeprecations(ctx, true, true, cloud, docsUrl);
    expect(deprecations).toHaveLength(1);
    expect(deprecations[0].correctiveActions.api?.path).toStrictEqual(
      '/internal/enterprise_search/deprecations/convert_connectors_to_client'
    );
    expect(deprecations[0].correctiveActions.api?.body).toStrictEqual({ ids: ['foo'] });
    expect(deprecations[0].title).toMatch('must be of supported service types');
  });

  it('Does not allow "native" connectors in non-agentless environments', async () => {
    const nativeConnector = {
      id: 'foo',
      is_native: true,
      service_type: 'github',
    } as Connector;
    const hasAgentless = false;
    mockedFetchConnectors = jest.fn().mockResolvedValue([nativeConnector]);
    const deprecations = await getNativeConnectorDeprecations(
      ctx,
      hasAgentless,
      true,
      notCloud,
      docsUrl
    );
    expect(deprecations).toHaveLength(1);
    expect(deprecations[0].correctiveActions.api?.path).toStrictEqual(
      '/internal/enterprise_search/deprecations/convert_connectors_to_client'
    );
    expect(deprecations[0].correctiveActions.api?.body).toStrictEqual({ ids: ['foo'] });
    expect(deprecations[0].title).toMatch('not supported in self-managed environments');
  });

  it('Does not allow native connector upgrades without fleet server', async () => {
    const nativeConnector = {
      id: 'foo',
      is_native: true,
      service_type: 'github',
    } as Connector;
    const hasFleetServer = false;
    mockedFetchConnectors = jest.fn().mockResolvedValue([nativeConnector]);
    const deprecations = await getNativeConnectorDeprecations(
      ctx,
      true,
      hasFleetServer,
      cloud,
      docsUrl
    );
    expect(deprecations).toHaveLength(1);
    expect(deprecations[0].title).toMatch('Integration Server must be provisioned');
  });

  it('Gives precedence to your env being ineligible for agentless', async () => {
    const connectors = [
      {
        id: 'foo',
        is_native: true,
        service_type: 'github',
      },
      {
        id: 'bar',
        is_native: true,
        service_type: 'fake',
      },
    ] as Connector[];
    const hasAgentless = false;
    const hasFleetServer = false;
    mockedFetchConnectors = jest.fn().mockResolvedValue(connectors);
    const deprecations = await getNativeConnectorDeprecations(
      ctx,
      hasAgentless,
      hasFleetServer,
      notCloud,
      docsUrl
    );
    expect(deprecations).toHaveLength(1);
    expect(deprecations[0].correctiveActions.api?.path).toStrictEqual(
      '/internal/enterprise_search/deprecations/convert_connectors_to_client'
    );
    expect(deprecations[0].correctiveActions.api?.body).toStrictEqual({ ids: ['foo', 'bar'] });
    expect(deprecations[0].title).toMatch('not supported in self-managed environments');
  });

  it('can register both fleet server missing and bad service types together', async () => {
    const connectors = [
      {
        id: 'foo',
        is_native: true,
        service_type: 'github',
      },
      {
        id: 'bar',
        is_native: true,
        service_type: 'fake',
      },
    ] as Connector[];
    const hasAgentless = true;
    const hasFleetServer = false;
    mockedFetchConnectors = jest.fn().mockResolvedValue(connectors);
    const deprecations = await getNativeConnectorDeprecations(
      ctx,
      hasAgentless,
      hasFleetServer,
      cloud,
      docsUrl
    );
    expect(deprecations).toHaveLength(2);
    expect(deprecations[0].correctiveActions.api?.path).toStrictEqual(
      '/internal/enterprise_search/deprecations/convert_connectors_to_client'
    );
    expect(deprecations[0].correctiveActions.api?.body).toStrictEqual({ ids: ['bar'] });
    expect(deprecations[0].title).toMatch('must be of supported service types');
    expect(deprecations[1].title).toMatch('Integration Server must be provisioned');
  });
});
