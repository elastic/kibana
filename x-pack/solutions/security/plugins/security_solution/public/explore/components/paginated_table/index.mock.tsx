/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOrEmptyTagFromValue } from '../../../common/components/empty_value';

import type { Columns, ItemsPerRow } from '.';

export const mockData = {
  Hosts: {
    totalCount: 4,
    edges: [
      {
        node: {
          host: {
            _id: 'cPsuhGcB0WOhS6qyTKC0',
            name: ['elrond.elstc.co'],
            os: {
              name: ['Ubuntu'],
              version: ['18.04.1 LTS (Bionic Beaver)'],
            },
            firstSeen: '2018-12-06T15:40:53.319Z',
          },
          firstSeen: '2018-12-06T15:40:53.319Z',
        },
        cursor: {
          value: '98966fa2013c396155c460d35c0902be',
        },
      },
      {
        node: {
          host: {
            _id: 'KwQDiWcB0WOhS6qyXmrW',
            name: ['siem-kibana'],
            os: {
              name: ['Debian GNU/Linux'],
              version: ['9 (stretch)'],
            },
            firstSeen: '2018-12-07T14:12:38.560Z',
          },
          firstSeen: '2018-12-07T14:12:38.560Z',
        },
        cursor: {
          value: 'aa7ca589f1b8220002f2fc61c64cfbf1',
        },
      },
    ],
    pageInfo: {
      activePage: 0,
      endCursor: {
        value: 'aa7ca589f1b8220002f2fc61c64cfbf1',
      },
    },
  },
};

export const getHostsColumns = (): [
  Columns<string>,
  Columns<string>,
  Columns<string>,
  Columns<string>
] => [
  {
    field: 'node.host.name',
    name: 'Host',
    truncateText: false,
    mobileOptions: { show: true },
    render: (name: string | string[]) =>
      getOrEmptyTagFromValue(Array.isArray(name) ? name[0] : name),
  },
  {
    field: 'node.host.firstSeen',
    name: 'First seen',
    truncateText: false,
    mobileOptions: { show: true },
    render: (firstSeen: string | string[]) =>
      getOrEmptyTagFromValue(Array.isArray(firstSeen) ? firstSeen[0] : firstSeen),
  },
  {
    field: 'node.host.os.name',
    name: 'Operating system',
    truncateText: false,
    mobileOptions: { show: true },
    render: (osName: string | string[]) =>
      getOrEmptyTagFromValue(Array.isArray(osName) ? osName[0] : osName),
  },
  {
    field: 'node.host.os.version',
    name: 'Version',
    truncateText: false,
    mobileOptions: { show: true },
    render: (osVersion: string | string[]) =>
      getOrEmptyTagFromValue(Array.isArray(osVersion) ? osVersion[0] : osVersion),
  },
];

export const sortedHosts: [Columns<string>, Columns<string>, Columns<string>, Columns<string>] =
  getHostsColumns().map((h) => ({ ...h, sortable: true })) as [
    Columns<string>,
    Columns<string>,
    Columns<string>,
    Columns<string>
  ];

export const rowItems: ItemsPerRow[] = [
  {
    text: '2 rows',
    numberOfRow: 2,
  },
  {
    text: '5 rows',
    numberOfRow: 5,
  },
  {
    text: '10 rows',
    numberOfRow: 10,
  },
  {
    text: '20 rows',
    numberOfRow: 20,
  },
  {
    text: '50 rows',
    numberOfRow: 50,
  },
];
