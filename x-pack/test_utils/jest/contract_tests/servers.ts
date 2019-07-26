/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import url from 'url';

import * as kbnTestServer from '../../../../src/test_utils/kbn_server';
import { TestKbnServerConfig } from '../../kbn_server_config';
import { pluginPaths, xpackOption } from './default_server_config';

interface ESServerConfig {
  hosts: string[];
  username: string;
  password: string;
}

type ESServer = {
  stop: () => void;
} & ESServerConfig;

let ESServer: ESServer;

function _parseESConnectionString(connectionString: string) {
  const { username, password } = (url.parse(connectionString) as unknown) as url.URL;

  return {
    hosts: [connectionString],
    username,
    password,
  };
}

/**
 * Create a new shared ES server,
 * this function should not be used outside of jest globalSetup
 */
export async function _createSharedServer() {
  if (process.env.ES_SERVER_URL) {
    process.env.__JEST__ESServer = JSON.stringify(
      _parseESConnectionString(process.env.ES_SERVER_URL)
    );
    return;
  }

  const servers = await kbnTestServer.createTestServers({
    // adjustTimeout function is required by createTestServers fn
    adjustTimeout: (t: number) => {},
    settings: TestKbnServerConfig,
  });
  ESServer = await servers.startES();
  const { hosts, username, password } = ESServer;

  // Use process.env here as globals are set by jest testEnvironment
  process.env.__JEST__ESServer = JSON.stringify({
    hosts,
    username,
    password,
  });
}

/**
 * Stop a shared ES server,
 * this function should not be used outside of jest globalTeardown
 */
export async function _stopSharedServer() {
  if (ESServer) {
    await ESServer.stop();
  }
}

export function getSharedESServer(): ESServerConfig {
  if (!process.env.__JEST__ESServer) {
    throw new Error('Enable to get shared ES Server');
  }
  return JSON.parse(process.env.__JEST__ESServer);
}

/**
 * Create a kibana server using a shared elasticsearch instance
 */
export async function createKibanaServer() {
  if (jest && jest.setTimeout) {
    // Allow kibana to start
    jest.setTimeout(120000);
  }
  const root = kbnTestServer.createRootWithCorePlugins({
    elasticsearch: { ...getSharedESServer() },
    plugins: { paths: [pluginPaths] },
    xpack: xpackOption,
  });
  await root.setup();
  await root.start();
  const { server } = (root as any).server.legacy.kbnServer;

  return {
    shutdown: () => root.shutdown(),
    kbnServer: server,
    root,
  };
}
