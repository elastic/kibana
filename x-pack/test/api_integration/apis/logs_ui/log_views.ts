/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { defaultLogViewId, LogViewAttributes } from '../../../../plugins/infra/common/log_views';
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

  describe('log view', () => {
    describe('GET', () => {
      before(async () => {
        await kibanaServer.savedObjects.clean({
          types: [infraSourceConfigurationSavedObjectName, logViewSavedObjectName],
        });
      });

      afterEach(async () => {
        await kibanaServer.savedObjects.clean({
          types: [infraSourceConfigurationSavedObjectName, logViewSavedObjectName],
        });
      });

      it('falls back to the static infra source default', async () => {
        const logView = await logViewsService.getLogView('NONEXISTENT_LOG_VIEW');
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
        expect(logView.data.origin).to.eql('infra-source-stored');
        expect(logView.data.attributes.name).to.eql('Test Infra Source');
        expect(logView.data.attributes.logIndices).to.eql({
          type: 'data_view',
          dataViewId: 'NONEXISTENT_INDEX_PATTERN',
        });
      });
    });

    describe('PUT', () => {
      before(async () => {
        await kibanaServer.savedObjects.clean({
          types: [infraSourceConfigurationSavedObjectName, logViewSavedObjectName],
        });
      });

      afterEach(async () => {
        await kibanaServer.savedObjects.clean({
          types: [infraSourceConfigurationSavedObjectName, logViewSavedObjectName],
        });
      });

      it('stores new log views', async () => {
        const logViewAttributes: Partial<LogViewAttributes> = {
          name: 'Test Log View 1',
          description: 'Test Description 1',
          logIndices: { type: 'data_view', dataViewId: 'NONEXISTENT_DATA_VIEW' },
          logColumns: [],
        };

        const storedLogView = await logViewsService.putLogView('TEST_LOG_VIEW_1', {
          attributes: logViewAttributes,
        });

        expect(storedLogView.data.attributes).to.eql(logViewAttributes);

        const fetchedLogView = await logViewsService.getLogView('TEST_LOG_VIEW_1');

        expect(fetchedLogView.data.attributes).to.eql(logViewAttributes);
      });

      it('stores new partial log views with default attributes', async () => {
        const storedLogView = await logViewsService.putLogView('TEST_LOG_VIEW_1', {
          attributes: {},
        });

        expect(storedLogView.data.attributes.name).to.be.a('string');
        expect(storedLogView.data.attributes.description).to.be.a('string');
        expect(storedLogView.data.attributes.logIndices.type).to.be.a('string');
        expect(storedLogView.data.attributes.logColumns).to.be.an('array');
        expect(storedLogView.data.attributes.logColumns).to.not.be.empty();

        const fetchedLogView = await logViewsService.getLogView('TEST_LOG_VIEW_1');

        expect(fetchedLogView.data.attributes.name).to.be.a('string');
        expect(fetchedLogView.data.attributes.description).to.be.a('string');
        expect(fetchedLogView.data.attributes.logIndices.type).to.be.a('string');
        expect(fetchedLogView.data.attributes.logColumns).to.be.an('array');
        expect(fetchedLogView.data.attributes.logColumns).to.not.be.empty();
      });

      it('overwrites existing log views', async () => {
        const initialLogViewAttributes: Partial<LogViewAttributes> = {
          name: 'Test Log View 1',
          description: 'Test Description 1',
          logIndices: { type: 'data_view', dataViewId: 'NONEXISTENT_DATA_VIEW' },
          logColumns: [],
        };
        const changedLogViewAttributes: Partial<LogViewAttributes> = {
          name: 'Test Log View 1A',
          description: 'Test Description 1A',
          logIndices: { type: 'data_view', dataViewId: 'NONEXISTENT_DATA_VIEW_A' },
          logColumns: [{ timestampColumn: { id: 'TIMESTAMP_COLUMN' } }],
        };

        const initialStoredLogView = await logViewsService.putLogView('TEST_LOG_VIEW_1', {
          attributes: initialLogViewAttributes,
        });

        expect(initialStoredLogView.data.attributes).to.eql(initialLogViewAttributes);

        const changedStoredLogView = await logViewsService.putLogView('TEST_LOG_VIEW_1', {
          attributes: changedLogViewAttributes,
        });

        expect(changedStoredLogView.data.attributes).to.eql(changedLogViewAttributes);
      });

      it('overwrites existing default log view', async () => {
        const oldestLogViewAttributes: Partial<LogViewAttributes> = {
          name: 'Oldest Log View 1',
          description: 'Oldest Description 1',
          logIndices: { type: 'data_view', dataViewId: 'NONEXISTENT_DATA_VIEW' },
          logColumns: [],
        };
        const newerLogViewAttributes: Partial<LogViewAttributes> = {
          name: 'Newer Log View 1',
          description: 'Newer Description 1',
          logIndices: { type: 'data_view', dataViewId: 'NONEXISTENT_DATA_VIEW' },
          logColumns: [],
        };
        const newestLogViewAttributes: Partial<LogViewAttributes> = {
          name: 'Newest Log View 1A',
          description: 'Newest Description 1A',
          logIndices: { type: 'data_view', dataViewId: 'NONEXISTENT_DATA_VIEW_A' },
          logColumns: [{ timestampColumn: { id: 'TIMESTAMP_COLUMN' } }],
        };

        // initially this is the default view
        const oldestStoredLogView = await logViewsService.putLogView('OLDEST_LOG_VIEW_ID', {
          attributes: oldestLogViewAttributes,
        });

        // check that it's interpreted as the default view
        const fetchedOldestLogView = await logViewsService.getLogView(defaultLogViewId);

        expect(oldestStoredLogView).to.eql(fetchedOldestLogView);

        // this becomes the default view now
        const newerStoredLogView = await logViewsService.putLogView('NEWER_LOG_VIEW_ID', {
          attributes: newerLogViewAttributes,
        });

        expect(newerStoredLogView.data.attributes).to.eql(newerLogViewAttributes);

        // this update should change the newer view
        const newestStoredLogView = await logViewsService.putLogView(defaultLogViewId, {
          attributes: newestLogViewAttributes,
        });

        expect(newestStoredLogView.data.attributes).to.eql(newestLogViewAttributes);

        // check that default id translation works
        expect(newerStoredLogView.data.id).to.eql(newestStoredLogView.data.id);

        // check that the oldest view is unchanged
        const refetchedOldestLogView = await logViewsService.getLogView('OLDEST_LOG_VIEW_ID');
        expect(refetchedOldestLogView).to.eql(fetchedOldestLogView);

        // check that the newer view has been changed
        const refetchedNewerLogView = await logViewsService.getLogView('NEWER_LOG_VIEW_ID');
        expect(refetchedNewerLogView).to.eql(newestStoredLogView);
      });
    });
  });
}
