/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';
import React from 'react';

import { hostsModel } from '../../store';

import { mockData } from './mock';
import { HostsType } from '../../store/model';
import * as i18n from './translations';
import { getUncommonColumnsCurated, getHostNames } from './columns';

jest.mock('../../../../common/lib/kibana');

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiScreenReaderOnly: () => <></>,
  };
});

jest.mock('../../../../common/components/link_to');

describe('Uncommon Process Columns', () => {
  const loadPage = jest.fn();

  const defaultProps = {
    data: mockData.edges,
    fakeTotalCount: getOr(50, 'fakeTotalCount', mockData.pageInfo),
    id: 'uncommonProcess',
    isInspect: false,
    loading: false,
    loadPage,
    setQuerySkip: jest.fn(),
    showMorePagesIndicator: getOr(false, 'showMorePagesIndicator', mockData.pageInfo),
    totalCount: mockData.totalCount,
    type: hostsModel.HostsType.page,
  };

  describe('#getHostNames', () => {
    test('when hosts is an empty array, it should return an empty array', () => {
      const hostNames = getHostNames(defaultProps.data[0].node.hosts);
      expect(hostNames.length).toEqual(0);
    });
    test('when hosts is an array with one elem, it should return an array with the name property of the item', () => {
      const hostNames = getHostNames(defaultProps.data[1].node.hosts);
      expect(hostNames.length).toEqual(1);
    });
    test('when hosts is an array with two elem, it should return an array with each name of each item', () => {
      const hostNames = getHostNames(defaultProps.data[2].node.hosts);
      expect(hostNames.length).toEqual(2);
    });
    test('when hosts is an array with items without name prop, it should return an empty array', () => {
      const hostNames = getHostNames(defaultProps.data[3].node.hosts);
      expect(hostNames.length).toEqual(0);
    });
  });

  describe('#getUncommonColumnsCurated', () => {
    test('on hosts page, we expect to get all columns', () => {
      expect(getUncommonColumnsCurated(HostsType.page).length).toEqual(6);
    });

    test('on host details page, we expect to remove two columns', () => {
      const columns = getUncommonColumnsCurated(HostsType.details);
      expect(columns.length).toEqual(4);
    });

    test('on host page, we should have hosts', () => {
      const columns = getUncommonColumnsCurated(HostsType.page);
      expect(columns.some((col) => col.name === i18n.HOSTS)).toEqual(true);
    });

    test('on host page, we should have number of hosts', () => {
      const columns = getUncommonColumnsCurated(HostsType.page);
      expect(columns.some((col) => col.name === i18n.NUMBER_OF_HOSTS)).toEqual(true);
    });

    test('on host details page, we should not have hosts', () => {
      const columns = getUncommonColumnsCurated(HostsType.details);
      expect(columns.some((col) => col.name === i18n.HOSTS)).toEqual(false);
    });

    test('on host details page, we should not have number of hosts', () => {
      const columns = getUncommonColumnsCurated(HostsType.details);
      expect(columns.some((col) => col.name === i18n.NUMBER_OF_HOSTS)).toEqual(false);
    });
  });
});
