/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { stubIndexPattern } from '@kbn/data-plugin/common/stubs';

import { ExceptionItemsFlyoutAlertsActions } from '.';
import { TestProviders } from '../../../../../common/mock';
import type { AlertData } from '../../../utils/types';
import { useSignalIndex } from '../../../../../detections/containers/detection_engine/alerts/use_signal_index';

jest.mock('../../../../../common/lib/kibana');
jest.mock('../../../../../detections/containers/detection_engine/alerts/use_signal_index');

const alertDataMock: AlertData = {
  '@timestamp': '1234567890',
  _id: 'test-id',
  file: { path: 'test/path' },
};

const mockUseSignalIndex = useSignalIndex as jest.Mock<Partial<ReturnType<typeof useSignalIndex>>>;

const defaultProps = {
  indexPatterns: stubIndexPattern,
  isIndexPatternLoading: false,
};

describe('ExceptionItemsFlyoutAlertsActions', () => {
  beforeEach(() => {
    mockUseSignalIndex.mockImplementation(() => ({
      loading: false,
      signalIndexName: 'mock-siem-signals-index',
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Endpoint specific logic', () => {
    it('it displays endpoint quarantine text if exception list type is "endpoint"', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ExceptionItemsFlyoutAlertsActions
            {...defaultProps}
            exceptionListItems={[getExceptionListItemSchemaMock()]}
            exceptionListType={ExceptionListTypeEnum.ENDPOINT}
            shouldCloseSingleAlert={false}
            shouldBulkCloseAlert={false}
            disableBulkClose={false}
            alertData={alertDataMock}
            alertStatus="open"
            onDisableBulkClose={jest.fn()}
            onUpdateBulkCloseIndex={jest.fn()}
            onBulkCloseCheckboxChange={jest.fn()}
            onSingleAlertCloseCheckboxChange={jest.fn()}
            isAlertDataLoading={false}
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="addExceptionEndpointText"]').exists()).toBeTruthy();
    });
  });

  describe('alert data exists', () => {
    it('it displays single alert close checkbox if alert status is not "closed" and "alertData" exists', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ExceptionItemsFlyoutAlertsActions
            {...defaultProps}
            exceptionListItems={[getExceptionListItemSchemaMock()]}
            exceptionListType={ExceptionListTypeEnum.DETECTION}
            shouldCloseSingleAlert={false}
            shouldBulkCloseAlert={false}
            disableBulkClose={false}
            alertData={alertDataMock}
            alertStatus="open"
            onDisableBulkClose={jest.fn()}
            onUpdateBulkCloseIndex={jest.fn()}
            onBulkCloseCheckboxChange={jest.fn()}
            onSingleAlertCloseCheckboxChange={jest.fn()}
            isAlertDataLoading={false}
          />
        </TestProviders>
      );

      expect(
        wrapper.find('[data-test-subj="closeAlertOnAddExceptionCheckbox"]').exists()
      ).toBeTruthy();
      expect(
        wrapper.find('[data-test-subj="closeAlertOnAddExceptionCheckbox"] input').prop('disabled')
      ).toBeFalsy();
    });

    it('it displays single alert close checkbox disabled if "isAlertDataLoading" is true', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ExceptionItemsFlyoutAlertsActions
            {...defaultProps}
            exceptionListItems={[getExceptionListItemSchemaMock()]}
            exceptionListType={ExceptionListTypeEnum.DETECTION}
            shouldCloseSingleAlert={false}
            shouldBulkCloseAlert={false}
            disableBulkClose={false}
            alertData={alertDataMock}
            alertStatus="open"
            onDisableBulkClose={jest.fn()}
            onUpdateBulkCloseIndex={jest.fn()}
            onBulkCloseCheckboxChange={jest.fn()}
            onSingleAlertCloseCheckboxChange={jest.fn()}
            isAlertDataLoading
          />
        </TestProviders>
      );

      expect(
        wrapper.find('[data-test-subj="closeAlertOnAddExceptionCheckbox"] input').prop('disabled')
      ).toBeTruthy();
    });

    it('it displays single alert close checkbox disabled if "isSignalIndexLoading" is true', () => {
      mockUseSignalIndex.mockImplementation(() => ({
        loading: true,
        signalIndexName: 'mock-siem-signals-index',
      }));

      const wrapper = mountWithIntl(
        <TestProviders>
          <ExceptionItemsFlyoutAlertsActions
            {...defaultProps}
            exceptionListItems={[getExceptionListItemSchemaMock()]}
            exceptionListType={ExceptionListTypeEnum.DETECTION}
            shouldCloseSingleAlert={false}
            shouldBulkCloseAlert={false}
            disableBulkClose={false}
            alertData={alertDataMock}
            alertStatus="open"
            onDisableBulkClose={jest.fn()}
            onUpdateBulkCloseIndex={jest.fn()}
            onBulkCloseCheckboxChange={jest.fn()}
            onSingleAlertCloseCheckboxChange={jest.fn()}
            isAlertDataLoading={false}
          />
        </TestProviders>
      );

      expect(
        wrapper.find('[data-test-subj="closeAlertOnAddExceptionCheckbox"] input').prop('disabled')
      ).toBeTruthy();
    });

    it('it displays single alert close checkbox disabled if "isIndexPatternLoading" is true', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ExceptionItemsFlyoutAlertsActions
            indexPatterns={stubIndexPattern}
            isIndexPatternLoading
            exceptionListItems={[getExceptionListItemSchemaMock()]}
            exceptionListType={ExceptionListTypeEnum.DETECTION}
            shouldCloseSingleAlert={false}
            shouldBulkCloseAlert={false}
            disableBulkClose={false}
            alertData={alertDataMock}
            alertStatus="open"
            onDisableBulkClose={jest.fn()}
            onUpdateBulkCloseIndex={jest.fn()}
            onBulkCloseCheckboxChange={jest.fn()}
            onSingleAlertCloseCheckboxChange={jest.fn()}
            isAlertDataLoading={false}
          />
        </TestProviders>
      );

      expect(
        wrapper.find('[data-test-subj="closeAlertOnAddExceptionCheckbox"] input').prop('disabled')
      ).toBeTruthy();
    });

    it('it does not display single alert close checkbox if alert status is "closed"', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ExceptionItemsFlyoutAlertsActions
            {...defaultProps}
            exceptionListItems={[getExceptionListItemSchemaMock()]}
            exceptionListType={ExceptionListTypeEnum.DETECTION}
            shouldCloseSingleAlert={false}
            shouldBulkCloseAlert={false}
            disableBulkClose={false}
            alertData={alertDataMock}
            alertStatus="closed"
            onDisableBulkClose={jest.fn()}
            onUpdateBulkCloseIndex={jest.fn()}
            onBulkCloseCheckboxChange={jest.fn()}
            onSingleAlertCloseCheckboxChange={jest.fn()}
            isAlertDataLoading={false}
          />
        </TestProviders>
      );

      expect(
        wrapper.find('[data-test-subj="closeAlertOnAddExceptionCheckbox"]').exists()
      ).toBeFalsy();
    });
  });

  describe('bulk close alert', () => {
    it('it does not display single alert close checkbox if "alertData" does not exist', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ExceptionItemsFlyoutAlertsActions
            {...defaultProps}
            exceptionListItems={[getExceptionListItemSchemaMock()]}
            exceptionListType={ExceptionListTypeEnum.DETECTION}
            shouldCloseSingleAlert={false}
            shouldBulkCloseAlert={false}
            disableBulkClose={false}
            alertData={undefined}
            alertStatus="open"
            onDisableBulkClose={jest.fn()}
            onUpdateBulkCloseIndex={jest.fn()}
            onBulkCloseCheckboxChange={jest.fn()}
            onSingleAlertCloseCheckboxChange={jest.fn()}
            isAlertDataLoading={false}
          />
        </TestProviders>
      );

      expect(
        wrapper.find('[data-test-subj="closeAlertOnAddExceptionCheckbox"]').exists()
      ).toBeFalsy();
    });

    it('it displays bulk close checkbox', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ExceptionItemsFlyoutAlertsActions
            {...defaultProps}
            exceptionListItems={[getExceptionListItemSchemaMock()]}
            exceptionListType={ExceptionListTypeEnum.DETECTION}
            shouldCloseSingleAlert={false}
            shouldBulkCloseAlert={false}
            disableBulkClose={false}
            alertData={alertDataMock}
            alertStatus="open"
            onDisableBulkClose={jest.fn()}
            onUpdateBulkCloseIndex={jest.fn()}
            onBulkCloseCheckboxChange={jest.fn()}
            onSingleAlertCloseCheckboxChange={jest.fn()}
            isAlertDataLoading={false}
          />
        </TestProviders>
      );

      expect(
        wrapper.find('[data-test-subj="bulkCloseAlertOnAddExceptionCheckbox"]').exists()
      ).toBeTruthy();
    });

    it('it displays checkboxes disabled if "isAlertDataLoading" is "true"', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ExceptionItemsFlyoutAlertsActions
            {...defaultProps}
            exceptionListItems={[getExceptionListItemSchemaMock()]}
            exceptionListType={ExceptionListTypeEnum.DETECTION}
            shouldCloseSingleAlert={false}
            shouldBulkCloseAlert={false}
            disableBulkClose={false}
            alertData={alertDataMock}
            alertStatus="open"
            onDisableBulkClose={jest.fn()}
            onUpdateBulkCloseIndex={jest.fn()}
            onBulkCloseCheckboxChange={jest.fn()}
            onSingleAlertCloseCheckboxChange={jest.fn()}
            isAlertDataLoading
          />
        </TestProviders>
      );

      expect(
        wrapper.find('[data-test-subj="bulkCloseAlertOnAddExceptionCheckbox"]').at(0).props()
          .disabled
      ).toBeTruthy();
      expect(
        wrapper.find('[data-test-subj="closeAlertOnAddExceptionCheckbox"]').at(0).props().disabled
      ).toBeTruthy();
    });

    it('it displays bulk close checkbox disabled if "disableBulkCloseAlert" is "true"', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ExceptionItemsFlyoutAlertsActions
            {...defaultProps}
            exceptionListItems={[getExceptionListItemSchemaMock()]}
            exceptionListType={ExceptionListTypeEnum.DETECTION}
            shouldCloseSingleAlert={false}
            shouldBulkCloseAlert={false}
            disableBulkClose={true}
            alertData={alertDataMock}
            alertStatus="open"
            onDisableBulkClose={jest.fn()}
            onUpdateBulkCloseIndex={jest.fn()}
            onBulkCloseCheckboxChange={jest.fn()}
            onSingleAlertCloseCheckboxChange={jest.fn()}
            isAlertDataLoading={false}
          />
        </TestProviders>
      );

      expect(
        wrapper.find('[data-test-subj="bulkCloseAlertOnAddExceptionCheckbox"]').at(0).props()
          .disabled
      ).toBeTruthy();
      expect(wrapper.find('[data-test-subj="addExceptionEndpointText"]').exists()).toBeFalsy();
    });

    it('it displays bulk close checkbox disabled if "isSignalIndexLoading" is "true"', () => {
      mockUseSignalIndex.mockImplementation(() => ({
        loading: true,
        signalIndexName: 'mock-siem-signals-index',
      }));

      const wrapper = mountWithIntl(
        <TestProviders>
          <ExceptionItemsFlyoutAlertsActions
            {...defaultProps}
            exceptionListItems={[getExceptionListItemSchemaMock()]}
            exceptionListType={ExceptionListTypeEnum.DETECTION}
            shouldCloseSingleAlert={false}
            shouldBulkCloseAlert={false}
            disableBulkClose={false}
            alertData={alertDataMock}
            alertStatus="open"
            onDisableBulkClose={jest.fn()}
            onUpdateBulkCloseIndex={jest.fn()}
            onBulkCloseCheckboxChange={jest.fn()}
            onSingleAlertCloseCheckboxChange={jest.fn()}
            isAlertDataLoading={false}
          />
        </TestProviders>
      );

      expect(
        wrapper.find('[data-test-subj="bulkCloseAlertOnAddExceptionCheckbox"]').at(0).props()
          .disabled
      ).toBeTruthy();
    });

    it('it displays bulk close checkbox disabled if "isIndexPatternLoading" is "true"', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ExceptionItemsFlyoutAlertsActions
            indexPatterns={stubIndexPattern}
            isIndexPatternLoading
            exceptionListItems={[getExceptionListItemSchemaMock()]}
            exceptionListType={ExceptionListTypeEnum.DETECTION}
            shouldCloseSingleAlert={false}
            shouldBulkCloseAlert={false}
            disableBulkClose={false}
            alertData={alertDataMock}
            alertStatus="open"
            onDisableBulkClose={jest.fn()}
            onUpdateBulkCloseIndex={jest.fn()}
            onBulkCloseCheckboxChange={jest.fn()}
            onSingleAlertCloseCheckboxChange={jest.fn()}
            isAlertDataLoading={false}
          />
        </TestProviders>
      );

      expect(
        wrapper.find('[data-test-subj="bulkCloseAlertOnAddExceptionCheckbox"]').at(0).props()
          .disabled
      ).toBeTruthy();
    });
  });
});
