/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import type { EntriesArray } from '@kbn/securitysolution-io-ts-list-types';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { stubIndexPattern } from '@kbn/data-plugin/common/stubs';

import { ExceptionItemsFlyoutAlertsActions } from '.';
import { TestProviders } from '../../../../../common/mock';
import type { AlertData } from '../../../utils/types';
import { useFetchIndex } from '../../../../../common/containers/source';
import { useSignalIndex } from '../../../../../detections/containers/detection_engine/alerts/use_signal_index';

jest.mock('../../../../../common/lib/kibana');
jest.mock('../../../../../common/containers/source');
jest.mock('../../../../../detections/containers/detection_engine/alerts/use_signal_index');

const alertDataMock: AlertData = {
  '@timestamp': '1234567890',
  _id: 'test-id',
  file: { path: 'test/path' },
};

const mockUseSignalIndex = useSignalIndex as jest.Mock<Partial<ReturnType<typeof useSignalIndex>>>;
const mockUseFetchIndex = useFetchIndex as jest.Mock;

describe('ExceptionItemsFlyoutAlertsActions', () => {
  beforeEach(() => {
    mockUseSignalIndex.mockImplementation(() => ({
      loading: false,
      signalIndexName: 'mock-siem-signals-index',
    }));
    mockUseFetchIndex.mockImplementation(() => [false, { indexPatterns: stubIndexPattern }]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Endpoint specific logic', () => {
    it('it displays endpoint quarantine text if exception list type is "endpoint"', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ExceptionItemsFlyoutAlertsActions
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

  describe('runtime / non-ECS field warning', () => {
    const nonEcsExceptionItems = [
      {
        ...getExceptionListItemSchemaMock(),
        // The stub alerts index pattern doesn't have this field, so the
        // component should treat it as a runtime / non-ECS field.
        entries: [{ field: 'source.ip_ecs', operator: 'included', type: 'match' }] as EntriesArray,
      },
    ];

    it('does not show the warning callout when bulk close is unchecked, even if the field is not on the alerts index', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ExceptionItemsFlyoutAlertsActions
            exceptionListItems={nonEcsExceptionItems}
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

      expect(wrapper.find('[data-test-subj="bulkCloseRuntimeFieldWarning"]').exists()).toBeFalsy();
    });

    it('shows the warning callout when bulk close is checked and the exception references a field not on the alerts index', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ExceptionItemsFlyoutAlertsActions
            exceptionListItems={nonEcsExceptionItems}
            exceptionListType={ExceptionListTypeEnum.DETECTION}
            shouldCloseSingleAlert={false}
            shouldBulkCloseAlert={true}
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

      expect(wrapper.find('[data-test-subj="bulkCloseRuntimeFieldWarning"]').exists()).toBeTruthy();
    });

    it('does not show the warning callout when all entries reference fields present on the alerts index', () => {
      // `stubIndexPattern` (returned by mockUseFetchIndex) contains
      // `machine.os.raw`, so the entry below should be treated as ECS-OK.
      const ecsExceptionItems = [
        {
          ...getExceptionListItemSchemaMock(),
          entries: [
            { field: 'machine.os.raw', operator: 'included', type: 'match', value: 'linux' },
          ] as EntriesArray,
        },
      ];

      const wrapper = mountWithIntl(
        <TestProviders>
          <ExceptionItemsFlyoutAlertsActions
            exceptionListItems={ecsExceptionItems}
            exceptionListType={ExceptionListTypeEnum.DETECTION}
            shouldCloseSingleAlert={false}
            shouldBulkCloseAlert={true}
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

      expect(wrapper.find('[data-test-subj="bulkCloseRuntimeFieldWarning"]').exists()).toBeFalsy();
    });
  });
});
