/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  defaultSourceConfiguration,
  infraSourceConfigurationSavedObjectName,
  mergeSourceConfiguration,
} from '../../../../plugins/infra/server/lib/sources';
import { extractSavedObjectReferences } from '../../../../plugins/infra/server/lib/sources/saved_object_references';
import { logViewSavedObjectName } from '../../../../plugins/infra/server/saved_objects/log_view';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const logViewsService = getService('infraLogViews');
  const kibanaServer = getService('kibanaServer');

  describe('GET log view', () => {
    before(async () => {
      await kibanaServer.savedObjects.clean({
        types: [infraSourceConfigurationSavedObjectName, logViewSavedObjectName],
      });
    });

    after(async () => {
      await kibanaServer.savedObjects.clean({
        types: [infraSourceConfigurationSavedObjectName, logViewSavedObjectName],
      });
    });

    it('falls back to the static infra source default', async () => {
      const logView = await logViewsService.getLogView('NONEXISTENT_LOG_VIEW');
      console.log(logView);
      expect(logView.data.origin).to.eql('infra-source-fallback');
    });

    it('falls back to a stored infra source', async () => {
      await kibanaServer.savedObjects.create({
        id: 'default',
        type: infraSourceConfigurationSavedObjectName,
        overwrite: true,
        ...extractSavedObjectReferences(
          mergeSourceConfiguration(defaultSourceConfiguration, {
            name: 'Test Infra Source',
            logIndices: { type: 'index_pattern', indexPatternId: 'NONEXISTENT_INDEX_PATTERN' },
          })
        ),
      });
      const logView = await logViewsService.getLogView('default');
      console.log(logView);
      expect(logView.data.origin).to.eql('infra-source-stored');
      expect(logView.data.attributes.name).to.eql('Test Infra Source');
      expect(logView.data.attributes.logIndices).to.eql({
        type: 'data_view',
        dataViewId: 'NONEXISTENT_INDEX_PATTERN',
      });
    });
  });
}
