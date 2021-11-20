/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SavedObject, SavedObjectReference } from 'src/core/server';
import { ActionTaskParams } from '../../../../../plugins/actions/server/types';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createGetTests({ getService }: FtrProviderContext) {
  const es = getService('es');
  const esArchiver = getService('esArchiver');

  describe('migrations', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/action_task_params');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/action_task_params');
    });

    it('7.16.0 migrates action_task_params to use references array', async () => {
      // Inspect migration of non-preconfigured connector ID
      const response = await es.get<SavedObject<ActionTaskParams>>(
        {
          index: '.kibana',
          id: 'action_task_params:b9af6280-0052-11ec-917b-f7aa317691ed',
        },
        { meta: true }
      );
      expect(response.statusCode).to.eql(200);
      const { actionId, relatedSavedObjects, references } = getActionIdAndRelatedSavedObjects(
        response.body._source
      );

      expect(references.find((ref: SavedObjectReference) => ref.name === 'actionRef')).to.eql({
        name: 'actionRef',
        id: actionId,
        type: 'action',
      });

      // Should have reference entry for each relatedSavedObject entry
      (relatedSavedObjects ?? []).forEach((relatedSavedObject: any) => {
        expect(
          references.find((ref: SavedObjectReference) => ref.name === relatedSavedObject.id)
        ).not.to.be(undefined);
      });

      // Inspect migration of preconfigured connector ID
      const preconfiguredConnectorResponse = await es.get<SavedObject<ActionTaskParams>>(
        {
          index: '.kibana',
          id: 'action_task_params:0205a520-0054-11ec-917b-f7aa317691ed',
        },
        { meta: true }
      );
      expect(preconfiguredConnectorResponse.statusCode).to.eql(200);

      const {
        relatedSavedObjects: preconfiguredRelatedSavedObjects,
        references: preconfiguredReferences,
      } = getActionIdAndRelatedSavedObjects(preconfiguredConnectorResponse.body._source);

      expect(
        preconfiguredReferences.find((ref: SavedObjectReference) => ref.name === 'actionRef')
      ).to.eql(undefined);

      // Should have reference entry for each relatedSavedObject entry
      (preconfiguredRelatedSavedObjects ?? []).forEach((relatedSavedObject: any) => {
        expect(
          preconfiguredReferences.find(
            (ref: SavedObjectReference) => ref.name === relatedSavedObject.id
          )
        ).not.to.be(undefined);
      });
    });
  });

  function getActionIdAndRelatedSavedObjects(responseSource: any) {
    if (!responseSource) {
      return {};
    }

    const actionTaskParams = (responseSource as any)?.action_task_params as ActionTaskParams;
    const actionId = actionTaskParams.actionId;
    const relatedSavedObjects = actionTaskParams.relatedSavedObjects as unknown[];
    const references = responseSource?.references ?? [];

    return { actionId, relatedSavedObjects, references };
  }
}
