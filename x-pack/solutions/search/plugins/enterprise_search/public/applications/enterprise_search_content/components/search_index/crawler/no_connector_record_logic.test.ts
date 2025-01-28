/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../../__mocks__/kea_logic';

import { KibanaLogic } from '../../../../shared/kibana';

import { RecreateCrawlerConnectorApiLogic } from '../../../api/crawler/recreate_crawler_connector_api_logic';
import { DeleteIndexApiLogic } from '../../../api/index/delete_index_api_logic';
import { SEARCH_INDICES_PATH } from '../../../routes';

import { NoConnectorRecordLogic } from './no_connector_record_logic';

describe('NoConnectorRecordLogic', () => {
  const { mount: deleteMount } = new LogicMounter(DeleteIndexApiLogic);
  const { mount: recreateMount } = new LogicMounter(RecreateCrawlerConnectorApiLogic);
  const { mount } = new LogicMounter(NoConnectorRecordLogic);
  beforeEach(() => {
    deleteMount();
    recreateMount();
    mount();
  });
  it('should redirect to search indices on delete', () => {
    KibanaLogic.values.navigateToUrl = jest.fn();
    DeleteIndexApiLogic.actions.apiSuccess({} as any);
    expect(KibanaLogic.values.navigateToUrl).toHaveBeenCalledWith(SEARCH_INDICES_PATH);
  });
  it('should fetch index on recreate', () => {
    NoConnectorRecordLogic.actions.fetchIndex = jest.fn();
    RecreateCrawlerConnectorApiLogic.actions.apiSuccess({} as any);
    expect(NoConnectorRecordLogic.actions.fetchIndex).toHaveBeenCalled();
  });
});
