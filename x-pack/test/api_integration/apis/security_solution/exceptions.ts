/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');

  describe('artifact manifest', () => {
    before(() => esArchiver.load('TODO'));
    after(() => esArchiver.unload('TODO'));

    it('Do a manifest test', () => {});
  });

  describe('artifact download', () => {
    before(() => esArchiver.load('TODO'));
    after(() => esArchiver.unload('TODO'));

    it('Do a download test', () => {});
  });
}
