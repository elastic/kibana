/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function connectorsTests({ loadTestFile }: FtrProviderContext) {
  describe('Connectors', () => {
    loadTestFile(require.resolve('./connector_types/cases/cases_webhook'));
    loadTestFile(require.resolve('./connector_types/cases/jira'));
    loadTestFile(require.resolve('./connector_types/cases/servicenow'));
    loadTestFile(require.resolve('./connector_types/cases/swimlane'));
    loadTestFile(require.resolve('./connector_types/stack/email'));
    loadTestFile(require.resolve('./connector_types/stack/es_index'));
    loadTestFile(require.resolve('./connector_types/stack/pagerduty'));
    loadTestFile(require.resolve('./connector_types/stack/server_log'));
    loadTestFile(require.resolve('./connector_types/stack/slack'));
    loadTestFile(require.resolve('./connector_types/stack/webhook'));
  });
}
