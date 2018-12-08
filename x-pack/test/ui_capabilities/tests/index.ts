/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TestInvoker } from '../../common/types';

// tslint:disable:no-default-export
export default function uiCapabilitesTests({ loadTestFile }: TestInvoker) {
  describe('ui capabilities', function() {
    this.tags('ciGroup5');

    loadTestFile(require.resolve('./nav_links'));
  });
}
