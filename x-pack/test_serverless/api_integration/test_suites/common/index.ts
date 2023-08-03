/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';
// eslint-disable-next-line @kbn/imports/no_boundary_crossing
import { setDefaultRequestHeaders } from '../../../../../test/api_integration/apis/search';

export default function ({ loadTestFile, getService }: FtrProviderContext) {
  describe('serverless common API', function () {
    loadTestFile(require.resolve('./security_users'));
    loadTestFile(require.resolve('./spaces'));
    loadTestFile(require.resolve('./security_response_headers'));
    setDefaultRequestHeaders(() => getService('svlCommonApi').getInternalRequestHeader());
    // eslint-disable-next-line @kbn/imports/no_boundary_crossing
    loadTestFile(require.resolve('../../../../../test/api_integration/apis/search'));
  });
}
