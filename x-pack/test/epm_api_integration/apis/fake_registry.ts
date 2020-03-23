/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import ServerMock from 'mock-http-server';
import { IncomingMessage } from 'http';
import { readFileSync } from 'fs';
import { join } from 'path';

type Request = IncomingMessage & { pathname: string; query: Record<string, string | number> };
type SyncBody = (req: Request) => void;
type AsyncBody = (req: Request, reply: (body: string) => void) => Promise<string>;

interface Package {
  packageResp?: string;
  searchResp?: string;
  archive?: Buffer;
}

interface Options {
  method?: string;
  path: string;
  filter?: (req: Request) => boolean;
  reply: {
    status?: number;
    headers?: Record<string, string>;
    body?: string | SyncBody | AsyncBody;
    end?: boolean;
  };
}

interface Server {
  start(done: () => void): void;
  stop(done: () => void): void;
  on(options: Options): void;
}

/**
 * This class sets up a fake package registry. It only handles the requests needed for the ingest manager's /setup
 * route so that the default packages can be installed.
 */
export class FakePackageRegistry {
  private readonly server: Server;
  private readonly responses: Record<string, Package>;
  private readonly allSearchResp: string;
  constructor() {
    this.server = new ServerMock({ host: 'localhost', port: 6666 });
    const { responses, allSearchResp } = FakePackageRegistry.loadResponses();
    this.responses = responses;
    this.allSearchResp = allSearchResp;
  }

  private static loadResponses(): { responses: Record<string, Package>; allSearchResp: string } {
    const responses: Record<string, Package> = {};
    const packages = ['base-1.0.0', 'system-0.9.0', 'endpoint-1.0.0'];
    for (const packageName of packages) {
      const packageResp = readFileSync(
        join(__dirname, 'fixtures/packages/package', packageName, 'package.json'),
        'utf8'
      );

      const searchResp = readFileSync(
        join(__dirname, 'fixtures/packages/package', packageName, 'search.json'),
        'utf8'
      );
      const archive = readFileSync(
        join(__dirname, 'fixtures/packages/epr', packageName + '.tar.gz')
      );
      const name = packageName.split('-')[0];
      responses[name] = { packageResp, searchResp, archive };
    }
    const allSearchResp = readFileSync(
      join(__dirname, 'fixtures/packages/package', 'all_search.json'),
      'utf8'
    );
    return { responses, allSearchResp };
  }

  start() {
    this.server.start(() => {});
    /**
     * Handle /search requests
     * e.g. /search?package=endpoint-1.0.0
     */
    this.server.on({
      method: 'GET',
      path: '/search',
      reply: {
        body: (req: Request) => {
          if (!req.query.package) {
            return this.allSearchResp;
          }
          const resp = this.responses[req.query?.package].searchResp;
          return resp;
        },
      },
    });

    /**
     * Handle /package requests
     * e.g. /package/system-0.9.0
     */
    this.server.on({
      method: 'GET',
      path: '*',
      filter: (req: Request) => {
        return req.pathname.startsWith('/package');
      },
      reply: {
        body: (req: Request) => {
          const packageName = req.pathname.split('/')[2];
          const resp = this.responses[packageName.split('-')[0]].packageResp;
          return resp;
        },
      },
    });

    /**
     * Handle /epr requests for downloading a package
     * e.g. /epr/endpoint/endpoint-1.0.0.tar.gz
     */
    this.server.on({
      method: 'GET',
      path: '*',
      filter: (req: Request) => {
        //
        return req.pathname.startsWith('/epr');
      },
      reply: {
        headers: { 'content-type': 'application/gzip' },
        body: (req: Request) => {
          const packageName = req.pathname.split('/')[2];
          // there's no version number on this one
          return this.responses[packageName].archive;
        },
      },
    });
  }

  stop() {
    this.server.stop(() => {});
  }
}
