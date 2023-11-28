/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import rison from '@kbn/rison';
import { FtrProviderContext } from './config';

const defaultLogColumns = ['@timestamp', 'service.name', 'host.name', 'message'];

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['discover', 'observabilityLogExplorer']);

  describe('Columns selection initialization and update', () => {
    before(async () => {
      await esArchiver.load(
        'x-pack/test/functional/es_archives/observability_log_explorer/data_streams'
      );
    });

    after(async () => {
      await esArchiver.unload(
        'x-pack/test/functional/es_archives/observability_log_explorer/data_streams'
      );
    });

    describe('when the log explorer loads', () => {
      it("should initialize the table columns to logs' default selection", async () => {
        await PageObjects.observabilityLogExplorer.navigateTo();

        await retry.try(async () => {
          expect(await PageObjects.discover.getColumnHeaders()).to.eql(defaultLogColumns);
        });
      });

      it('should restore the table columns from the URL state if exists', async () => {
        await PageObjects.observabilityLogExplorer.navigateTo({
          search: {
            _a: rison.encode({
              columns: ['service.name', 'host.name', 'message', 'data_stream.namespace'],
            }),
          },
        });

        await retry.try(async () => {
          expect(await PageObjects.discover.getColumnHeaders()).to.eql([
            ...defaultLogColumns,
            'data_stream.namespace',
          ]);
        });
      });
    });
  });
}
