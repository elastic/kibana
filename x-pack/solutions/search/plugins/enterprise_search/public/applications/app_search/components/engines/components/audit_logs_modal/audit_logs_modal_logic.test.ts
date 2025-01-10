/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../../../__mocks__/kea_logic';

import { AuditLogsModalLogic } from './audit_logs_modal_logic';

describe('AuditLogsModalLogic', () => {
  const { mount } = new LogicMounter(AuditLogsModalLogic);

  beforeEach(() => {
    jest.clearAllMocks();
    mount();
  });

  it('has excepted default values', () => {
    expect(AuditLogsModalLogic.values).toEqual({
      isModalVisible: false,
      engineName: '',
    });
  });

  describe('actions', () => {
    describe('hideModal', () => {
      it('hides the modal', () => {
        mount({
          isModalVisible: true,
          engineName: 'test_engine',
        });

        AuditLogsModalLogic.actions.hideModal();
        expect(AuditLogsModalLogic.values).toEqual({
          isModalVisible: false,
          engineName: '',
        });
      });
    });

    describe('showModal', () => {
      it('show the modal with correct engine name', () => {
        AuditLogsModalLogic.actions.showModal('test-engine-123');
        expect(AuditLogsModalLogic.values).toEqual({
          isModalVisible: true,
          engineName: 'test-engine-123',
        });
      });
    });
  });
});
