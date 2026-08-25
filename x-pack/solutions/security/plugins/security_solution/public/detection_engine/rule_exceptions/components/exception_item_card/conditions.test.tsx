/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { TestProviders } from '../../../../common/mock';
import { ExceptionItemCardConditions } from './conditions';

describe('ExceptionItemCardConditions', () => {
  it('it includes os condition if one exists', () => {
    const wrapper = mount(
      <TestProviders>
        <ExceptionItemCardConditions
          os={['linux']}
          entries={[
            {
              field: 'host.name',
              operator: 'included',
              type: 'match',
              value: 'host',
            },
            {
              field: 'threat.indicator.port',
              operator: 'included',
              type: 'exists',
            },
            {
              entries: [
                {
                  field: 'valid',
                  operator: 'included',
                  type: 'match',
                  value: 'true',
                },
              ],
              field: 'file.Ext.code_signature',
              type: 'nested',
            },
          ]}
          dataTestSubj="exceptionItemConditions"
        />
      </TestProviders>
    );

    // Text is gonna look a bit off unformatted
    expect(wrapper.find('[data-test-subj="exceptionItemConditions-os"]').at(0).text()).toEqual(
      ' OSIS Linux'
    );
    expect(
      wrapper.find('[data-test-subj="exceptionItemConditions-condition"]').at(0).text()
    ).toEqual(' host.nameIS host');
    expect(
      wrapper.find('[data-test-subj="exceptionItemConditions-condition"]').at(1).text()
    ).toEqual('AND threat.indicator.portexists ');
    expect(
      wrapper.find('[data-test-subj="exceptionItemConditions-condition"]').at(2).text()
    ).toEqual('AND file.Ext.code_signature  validIS true');
  });

  it('it renders item conditions', () => {
    const wrapper = mount(
      <TestProviders>
        <ExceptionItemCardConditions
          entries={[
            {
              field: 'host.name',
              operator: 'included',
              type: 'match',
              value: 'host',
            },
            {
              field: 'host.name',
              operator: 'excluded',
              type: 'match',
              value: 'host',
            },
            {
              field: 'host.name',
              operator: 'included',
              type: 'match_any',
              value: ['foo', 'bar'],
            },
            {
              field: 'host.name',
              operator: 'excluded',
              type: 'match_any',
              value: ['foo', 'bar'],
            },
            {
              field: 'user.name',
              operator: 'included',
              type: 'wildcard',
              value: 'foo*',
            },
            {
              field: 'user.name',
              operator: 'excluded',
              type: 'wildcard',
              value: 'foo*',
            },
            {
              field: 'threat.indicator.port',
              operator: 'included',
              type: 'exists',
            },
            {
              field: 'threat.indicator.port',
              operator: 'excluded',
              type: 'exists',
            },
            {
              entries: [
                {
                  field: 'valid',
                  operator: 'included',
                  type: 'match',
                  value: 'true',
                },
              ],
              field: 'file.Ext.code_signature',
              type: 'nested',
            },
          ]}
          dataTestSubj="exceptionItemConditions"
        />
      </TestProviders>
    );

    // Text is gonna look a bit off unformatted
    expect(wrapper.find('[data-test-subj="exceptionItemConditions-os"]').exists()).toBeFalsy();
    // MATCH
    expect(
      wrapper.find('[data-test-subj="exceptionItemConditions-condition"]').at(0).text()
    ).toEqual(' host.nameIS host');
    expect(
      wrapper.find('[data-test-subj="exceptionItemConditions-condition"]').at(1).text()
    ).toEqual('AND host.nameIS NOT host');

    // MATCH_ANY
    expect(
      wrapper.find('[data-test-subj="exceptionItemConditions-condition"]').at(2).text()
    ).toEqual('AND host.nameis one of foobar');
    expect(
      wrapper.find('[data-test-subj="exceptionItemConditions-condition"]').at(3).text()
    ).toEqual('AND host.nameis not one of foobar');

    // WILDCARD
    expect(
      wrapper.find('[data-test-subj="exceptionItemConditions-condition"]').at(4).text()
    ).toEqual('AND user.nameMATCHES foo*');
    expect(
      wrapper.find('[data-test-subj="exceptionItemConditions-condition"]').at(5).text()
    ).toEqual('AND user.nameDOES NOT MATCH foo*');

    // EXISTS
    expect(
      wrapper.find('[data-test-subj="exceptionItemConditions-condition"]').at(6).text()
    ).toEqual('AND threat.indicator.portexists ');
    expect(
      wrapper.find('[data-test-subj="exceptionItemConditions-condition"]').at(7).text()
    ).toEqual('AND threat.indicator.portdoes not exist ');

    // NESTED
    expect(
      wrapper.find('[data-test-subj="exceptionItemConditions-condition"]').at(8).text()
    ).toEqual('AND file.Ext.code_signature  validIS true');
  });

  it('it renders list conditions', () => {
    const wrapper = mount(
      <TestProviders>
        <ExceptionItemCardConditions
          entries={[
            {
              field: 'host.name',
              list: {
                id: 'ips.txt',
                type: 'keyword',
              },
              operator: 'included',
              type: 'list',
            },
            {
              field: 'host.name',
              list: {
                id: 'ips.txt',
                type: 'keyword',
              },
              operator: 'excluded',
              type: 'list',
            },
          ]}
          dataTestSubj="exceptionItemConditions"
        />
      </TestProviders>
    );

    // Text is gonna look a bit off unformatted
    expect(
      wrapper.find('[data-test-subj="exceptionItemConditions-condition"]').at(0).text()
    ).toEqual(' host.nameincluded in ips.txt');
    expect(
      wrapper.find('[data-test-subj="exceptionItemConditions-condition"]').at(1).text()
    ).toEqual('AND host.nameis not included in ips.txt');
  });
});
