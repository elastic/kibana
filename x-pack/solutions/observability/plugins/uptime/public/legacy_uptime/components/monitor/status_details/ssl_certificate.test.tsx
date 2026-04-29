/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
// Necessary until components being tested are migrated of styled-components https://github.com/elastic/kibana/issues/219037
import 'jest-styled-components';
import moment from 'moment';
import { EuiIcon } from '@elastic/eui';
import type { Tls } from '../../../../../common/runtime_types';
import { MonitorSSLCertificate } from './status_bar';
import * as redux from 'react-redux';
import { mountWithRouter, renderWithRouter, shallowWithRouter } from '../../../lib';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../../../common/constants';

function getTlsData(not_after: string, not_before: string): Tls {
  return {
    server: {
      x509: {
        not_before,
        not_after,
        subject: {
          common_name: 'r2.shared.global.fastly.net',
          distinguished_name: '',
        },
        issuer: {
          common_name: 'GlobalSign CloudSSL CA - SHA256 - G3',
          distinguished_name: '',
        },
        serial_number: '1234567890',
        public_key_algorithm: 'RSA',
        signature_algorithm: 'SHA256-RSA',
      },
      hash: {
        sha1: 'b7b4b89ef0d0caf39d223736f0fdbb03c7b426f1',
        sha256: '12b00d04db0db8caa302bfde043e88f95baceb91e86ac143e93830b4bbec726d',
      },
    },
  };
}

describe('SSL Certificate component', () => {
  let monitorTls: Tls;
  const dateInTwoMonths = moment().add(2, 'month').toString();
  const yesterday = moment().subtract(1, 'day').toString();

  beforeEach(() => {
    monitorTls = getTlsData(dateInTwoMonths, yesterday);

    const useDispatchSpy = jest.spyOn(redux, 'useDispatch');
    useDispatchSpy.mockReturnValue(jest.fn());

    const useSelectorSpy = jest.spyOn(redux, 'useSelector');
    useSelectorSpy.mockReturnValue({ settings: DYNAMIC_SETTINGS_DEFAULTS });
  });

  it('shallow renders', () => {
    const monitorTls1 = getTlsData('2020-04-24T11:41:38.200Z', '2019-04-24T11:41:38.200Z');

    const component = shallowWithRouter(<MonitorSSLCertificate tls={monitorTls1} />);
    // dive() removes all unnecessary React-Router wrapping elements
    expect(component.dive()).toMatchSnapshot();
  });

  it('renders', () => {
    const component = renderWithRouter(<MonitorSSLCertificate tls={monitorTls} />);
    expect(component).toMatchSnapshot();
  });

  it('renders null if invalid date', () => {
    monitorTls = getTlsData('i am so invalid date', 'i am so invalid date');
    const component = renderWithRouter(<MonitorSSLCertificate tls={monitorTls} />);
    expect(component).toMatchSnapshot();
  });

  it('renders expiration date with a warning state if ssl expiry date is less than 5 days', () => {
    const dateIn5Days = moment().add(5, 'day').toString();
    monitorTls = getTlsData(dateIn5Days, yesterday);
    const component = mountWithRouter(<MonitorSSLCertificate tls={monitorTls} />);

    const lockIcon = component.find(EuiIcon);

    expect(lockIcon.props().color).toBe('warning');

    const componentText = component.find('h4');
    expect(componentText.text()).toBe('Expires soon ' + moment(dateIn5Days).fromNow());
  });

  it('does not render the expiration date with a warning state if expiry date is greater than a month', () => {
    const dateIn40Days = moment().add(40, 'day').toString();
    monitorTls = getTlsData(dateIn40Days, yesterday);
    const component = mountWithRouter(<MonitorSSLCertificate tls={monitorTls} />);

    const lockIcon = component.find(EuiIcon);
    expect(lockIcon.props().color).toBe('success');

    const componentText = component.find('h4');
    expect(componentText.text()).toBe('Expires ' + moment(dateIn40Days).fromNow());
  });
});
