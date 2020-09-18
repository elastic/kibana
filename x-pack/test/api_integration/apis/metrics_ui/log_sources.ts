/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { beforeEach } from 'mocha';
import {
  getLogSourceConfigurationSuccessResponsePayloadRT,
  patchLogSourceConfigurationSuccessResponsePayloadRT,
} from '../../../../plugins/infra/common/http_api/log_sources';
import { decodeOrThrow } from '../../../../plugins/infra/common/runtime_types';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const logSourceConfiguration = getService('infraLogSourceConfiguration');

  describe('log sources api', () => {
    before(() => esArchiver.load('infra/metrics_and_logs'));
    after(() => esArchiver.unload('infra/metrics_and_logs'));
    beforeEach(() => esArchiver.load('empty_kibana'));
    afterEach(() => esArchiver.unload('empty_kibana'));

    describe('source configuration get method for non-existant source', () => {
      it('returns the default source configuration', async () => {
        const response = await logSourceConfiguration
          .createGetLogSourceConfigurationAgent('default')
          .expect(200);

        const {
          data: { configuration, origin },
        } = decodeOrThrow(getLogSourceConfigurationSuccessResponsePayloadRT)(response.body);

        expect(origin).to.be('fallback');
        expect(configuration.name).to.be('Default');
        expect(configuration.logAlias).to.be('logs-*,filebeat-*,kibana_sample_data_logs*');
        expect(configuration.fields.timestamp).to.be('@timestamp');
        expect(configuration.fields.tiebreaker).to.be('_doc');
        expect(configuration.logColumns[0]).to.have.key('timestampColumn');
        expect(configuration.logColumns[1]).to.have.key('fieldColumn');
        expect(configuration.logColumns[2]).to.have.key('messageColumn');
      });
    });

    describe('source configuration patch method for non-existant source', () => {
      it('creates a source configuration', async () => {
        const response = await logSourceConfiguration
          .createUpdateLogSourceConfigurationAgent('default', {
            name: 'NAME',
            description: 'DESCRIPTION',
            logAlias: 'filebeat-**',
            fields: {
              tiebreaker: 'TIEBREAKER',
              timestamp: 'TIMESTAMP',
            },
            logColumns: [
              {
                messageColumn: {
                  id: 'MESSAGE_COLUMN',
                },
              },
            ],
          })
          .expect(200);

        // check direct response
        const {
          data: { configuration, origin },
        } = decodeOrThrow(patchLogSourceConfigurationSuccessResponsePayloadRT)(response.body);

        expect(configuration.name).to.be('NAME');
        expect(origin).to.be('stored');
        expect(configuration.logAlias).to.be('filebeat-**');
        expect(configuration.fields.timestamp).to.be('TIMESTAMP');
        expect(configuration.fields.tiebreaker).to.be('TIEBREAKER');
        expect(configuration.logColumns).to.have.length(1);
        expect(configuration.logColumns[0]).to.have.key('messageColumn');

        // check for persistence
        const {
          data: { configuration: persistedConfiguration },
        } = await logSourceConfiguration.getLogSourceConfiguration('default');

        expect(configuration).to.eql(persistedConfiguration);
      });

      it('creates a source configuration with default values for unspecified properties', async () => {
        const response = await logSourceConfiguration
          .createUpdateLogSourceConfigurationAgent('default', {})
          .expect(200);

        const {
          data: { configuration, origin },
        } = decodeOrThrow(patchLogSourceConfigurationSuccessResponsePayloadRT)(response.body);

        expect(configuration.name).to.be('Default');
        expect(origin).to.be('stored');
        expect(configuration.logAlias).to.be('logs-*,filebeat-*,kibana_sample_data_logs*');
        expect(configuration.fields.timestamp).to.be('@timestamp');
        expect(configuration.fields.tiebreaker).to.be('_doc');
        expect(configuration.logColumns).to.have.length(3);
        expect(configuration.logColumns[0]).to.have.key('timestampColumn');
        expect(configuration.logColumns[1]).to.have.key('fieldColumn');
        expect(configuration.logColumns[2]).to.have.key('messageColumn');

        // check for persistence
        const {
          data: { configuration: persistedConfiguration, origin: persistedOrigin },
        } = await logSourceConfiguration.getLogSourceConfiguration('default');

        expect(persistedOrigin).to.be('stored');
        expect(configuration).to.eql(persistedConfiguration);
      });
    });

    describe('source configuration patch method for existing source', () => {
      beforeEach(async () => {
        await logSourceConfiguration.updateLogSourceConfiguration('default', {});
      });

      it('updates a source configuration', async () => {
        const response = await logSourceConfiguration
          .createUpdateLogSourceConfigurationAgent('default', {
            name: 'NAME',
            description: 'DESCRIPTION',
            logAlias: 'filebeat-**',
            fields: {
              tiebreaker: 'TIEBREAKER',
              timestamp: 'TIMESTAMP',
            },
            logColumns: [
              {
                messageColumn: {
                  id: 'MESSAGE_COLUMN',
                },
              },
            ],
          })
          .expect(200);

        const {
          data: { configuration, origin },
        } = decodeOrThrow(patchLogSourceConfigurationSuccessResponsePayloadRT)(response.body);

        expect(configuration.name).to.be('NAME');
        expect(origin).to.be('stored');
        expect(configuration.logAlias).to.be('filebeat-**');
        expect(configuration.fields.timestamp).to.be('TIMESTAMP');
        expect(configuration.fields.tiebreaker).to.be('TIEBREAKER');
        expect(configuration.logColumns).to.have.length(1);
        expect(configuration.logColumns[0]).to.have.key('messageColumn');
      });

      it('partially updates a source configuration', async () => {
        const response = await logSourceConfiguration
          .createUpdateLogSourceConfigurationAgent('default', {
            name: 'NAME',
          })
          .expect(200);

        const {
          data: { configuration, origin },
        } = decodeOrThrow(patchLogSourceConfigurationSuccessResponsePayloadRT)(response.body);

        expect(configuration.name).to.be('NAME');
        expect(origin).to.be('stored');
        expect(configuration.logAlias).to.be('logs-*,filebeat-*,kibana_sample_data_logs*');
        expect(configuration.fields.timestamp).to.be('@timestamp');
        expect(configuration.fields.tiebreaker).to.be('_doc');
        expect(configuration.logColumns).to.have.length(3);
        expect(configuration.logColumns[0]).to.have.key('timestampColumn');
        expect(configuration.logColumns[1]).to.have.key('fieldColumn');
        expect(configuration.logColumns[2]).to.have.key('messageColumn');
      });
    });
  });
}
