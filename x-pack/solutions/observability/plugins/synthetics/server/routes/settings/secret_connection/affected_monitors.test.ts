/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAllowedHostsRefusal } from './affected_monitors';

const allowed = new Set(['api.example.com', '10.0.0.1', '::1']);

describe('getAllowedHostsRefusal', () => {
  it.each([
    ['an http monitor on an allowed host', { type: 'http', urls: 'https://API.example.com/path' }],
    ['a tcp monitor with a port', { type: 'tcp', hosts: 'api.example.com:443' }],
    ['an icmp monitor', { type: 'icmp', hosts: '10.0.0.1' }],
    ['an IPv6 target', { type: 'tcp', hosts: '[::1]:8080' }],
    [
      'a proxy on an allowed host',
      { type: 'http', urls: 'https://api.example.com', proxy_url: 'http://api.example.com:3128' },
    ],
    ['zero redirects', { type: 'http', urls: 'https://api.example.com', max_redirects: '0' }],
  ])('lets %s use the connection', (_name, monitor) => {
    expect(getAllowedHostsRefusal(monitor, allowed)).toBeUndefined();
  });

  it.each([
    ['browser monitors', { type: 'browser' }, 'monitor_type'],
    ['unknown monitor types', { type: 'api' }, 'monitor_type'],
    [
      'http redirects',
      { type: 'http', urls: 'https://api.example.com', max_redirects: '5' },
      'redirects',
    ],
    ['a different host', { type: 'http', urls: 'https://evil.example.com' }, 'host'],
    ['a different tcp host', { type: 'tcp', hosts: 'evil.example.com:443' }, 'host'],
    [
      'a proxy on another host',
      { type: 'http', urls: 'https://api.example.com', proxy_url: 'http://proxy.example.com' },
      'host',
    ],
    ['a target that is not resolved', { type: 'http', urls: 'https://${host}/x' }, 'host'],
    ['an empty target', { type: 'http', urls: '' }, 'host'],
  ])('refuses %s', (_name, monitor, reason) => {
    expect(getAllowedHostsRefusal(monitor, allowed)).toBe(reason);
  });
});
