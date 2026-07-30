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
import * as i18n from './translations';
import { TestProviders } from '../../../../../common/mock';
import type { AlertData } from '../../../utils/types';

jest.mock('../../../../../common/lib/kibana');

const alertDataMock: AlertData = {
  '@timestamp': '1234567890',
  _id: 'test-id',
  file: { path: 'test/path' },
};

type ComponentProps = React.ComponentProps<typeof ExceptionItemsFlyoutAlertsActions>;

const defaultProps: ComponentProps = {
  exceptionListItems: [getExceptionListItemSchemaMock()],
  exceptionListType: ExceptionListTypeEnum.DETECTION,
  shouldCloseSingleAlert: false,
  shouldBulkCloseAlert: false,
  disableBulkClose: false,
  alertData: alertDataMock,
  alertStatus: 'open',
  isAlertDataLoading: false,
  isSignalIndexLoading: false,
  signalIndexNames: ['mock-siem-signals-index'],
  isSignalIndexPatternLoading: false,
  signalIndexPatterns: stubIndexPattern,
  onDisableBulkClose: jest.fn(),
  onUpdateBulkCloseIndex: jest.fn(),
  onBulkCloseCheckboxChange: jest.fn(),
  onSingleAlertCloseCheckboxChange: jest.fn(),
};

const mountComponent = (props: Partial<ComponentProps> = {}) =>
  mountWithIntl(
    <TestProviders>
      <ExceptionItemsFlyoutAlertsActions {...defaultProps} {...props} />
    </TestProviders>
  );

describe('ExceptionItemsFlyoutAlertsActions', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Endpoint specific logic', () => {
    it('it displays endpoint quarantine text if exception list type is "endpoint"', () => {
      const wrapper = mountComponent({ exceptionListType: ExceptionListTypeEnum.ENDPOINT });

      expect(wrapper.find('[data-test-subj="addExceptionEndpointText"]').exists()).toBeTruthy();
    });
  });

  describe('alert data exists', () => {
    it('it displays single alert close checkbox if alert status is not "closed" and "alertData" exists', () => {
      const wrapper = mountComponent();

      expect(
        wrapper.find('[data-test-subj="closeAlertOnAddExceptionCheckbox"]').exists()
      ).toBeTruthy();
      expect(
        wrapper.find('[data-test-subj="closeAlertOnAddExceptionCheckbox"] input').prop('disabled')
      ).toBeFalsy();
    });

    it('it displays single alert close checkbox disabled if "isAlertDataLoading" is true', () => {
      const wrapper = mountComponent({ isAlertDataLoading: true });

      expect(
        wrapper.find('[data-test-subj="closeAlertOnAddExceptionCheckbox"] input').prop('disabled')
      ).toBeTruthy();
    });

    it('it displays single alert close checkbox disabled if "isSignalIndexLoading" is true', () => {
      const wrapper = mountComponent({ isSignalIndexLoading: true });

      expect(
        wrapper.find('[data-test-subj="closeAlertOnAddExceptionCheckbox"] input').prop('disabled')
      ).toBeTruthy();
    });

    it('it does not display single alert close checkbox if alert status is "closed"', () => {
      const wrapper = mountComponent({ alertStatus: 'closed' });

      expect(
        wrapper.find('[data-test-subj="closeAlertOnAddExceptionCheckbox"]').exists()
      ).toBeFalsy();
    });
  });

  describe('bulk close alert', () => {
    it('it does not display single alert close checkbox if "alertData" does not exist', () => {
      const wrapper = mountComponent({ alertData: undefined });

      expect(
        wrapper.find('[data-test-subj="closeAlertOnAddExceptionCheckbox"]').exists()
      ).toBeFalsy();
    });

    it('it displays bulk close checkbox', () => {
      const wrapper = mountComponent();

      expect(
        wrapper.find('[data-test-subj="bulkCloseAlertOnAddExceptionCheckbox"]').exists()
      ).toBeTruthy();
    });

    it('it displays checkboxes disabled if "isAlertDataLoading" is "true"', () => {
      const wrapper = mountComponent({ isAlertDataLoading: true });

      expect(
        wrapper.find('[data-test-subj="bulkCloseAlertOnAddExceptionCheckbox"]').at(0).props()
          .disabled
      ).toBeTruthy();
      expect(
        wrapper.find('[data-test-subj="closeAlertOnAddExceptionCheckbox"]').at(0).props().disabled
      ).toBeTruthy();
    });

    it('it displays bulk close checkbox disabled if "disableBulkCloseAlert" is "true"', () => {
      const wrapper = mountComponent({ disableBulkClose: true });

      expect(
        wrapper.find('[data-test-subj="bulkCloseAlertOnAddExceptionCheckbox"]').at(0).props()
          .disabled
      ).toBeTruthy();
      expect(wrapper.find('[data-test-subj="addExceptionEndpointText"]').exists()).toBeFalsy();
    });

    it('it displays bulk close checkbox disabled if "isSignalIndexLoading" is "true"', () => {
      const wrapper = mountComponent({ isSignalIndexLoading: true });

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
      const wrapper = mountComponent({
        exceptionListItems: nonEcsExceptionItems,
        shouldBulkCloseAlert: false,
      });

      expect(wrapper.find('[data-test-subj="bulkCloseRuntimeFieldWarning"]').exists()).toBeFalsy();
    });

    it('shows the warning callout with the title and main body when bulk close is checked and the exception references a field not on the alerts index', () => {
      const wrapper = mountComponent({
        exceptionListItems: nonEcsExceptionItems,
        shouldBulkCloseAlert: true,
      });

      const callout = wrapper.find('[data-test-subj="bulkCloseRuntimeFieldWarning"]').first();
      expect(callout.exists()).toBe(true);
      expect(callout.text()).toContain(i18n.BULK_CLOSE_RUNTIME_FIELD_WARNING_TITLE);
      expect(callout.text()).toContain(i18n.BULK_CLOSE_RUNTIME_FIELD_WARNING_BODY);
    });

    it('does not show the warning callout while the alerts-index fields are still loading', () => {
      const wrapper = mountComponent({
        exceptionListItems: nonEcsExceptionItems,
        shouldBulkCloseAlert: true,
        isSignalIndexPatternLoading: true,
      });

      expect(wrapper.find('[data-test-subj="bulkCloseRuntimeFieldWarning"]').exists()).toBeFalsy();
    });

    it('does not show the warning callout when all entries reference fields present on the alerts index', () => {
      // `stubIndexPattern` contains `machine.os.raw`, so the entry below
      // should be treated as ECS-OK.
      const ecsExceptionItems = [
        {
          ...getExceptionListItemSchemaMock(),
          entries: [
            { field: 'machine.os.raw', operator: 'included', type: 'match', value: 'linux' },
          ] as EntriesArray,
        },
      ];

      const wrapper = mountComponent({
        exceptionListItems: ecsExceptionItems,
        shouldBulkCloseAlert: true,
      });

      expect(wrapper.find('[data-test-subj="bulkCloseRuntimeFieldWarning"]').exists()).toBeFalsy();
    });

    it('renders the untyped-fallback callout body when "hasUntypedRuntimeFields" is true', () => {
      const wrapper = mountComponent({
        exceptionListItems: nonEcsExceptionItems,
        shouldBulkCloseAlert: true,
        hasUntypedRuntimeFields: true,
      });

      const callout = wrapper.find('[data-test-subj="bulkCloseRuntimeFieldWarning"]').first();
      expect(callout.exists()).toBeTruthy();
      expect(callout.text()).toContain(i18n.BULK_CLOSE_RUNTIME_FIELD_WARNING_UNTYPED_BODY);
    });

    it('does not render the untyped-fallback callout body when "hasUntypedRuntimeFields" is false', () => {
      const wrapper = mountComponent({
        exceptionListItems: nonEcsExceptionItems,
        shouldBulkCloseAlert: true,
        hasUntypedRuntimeFields: false,
      });

      const callout = wrapper.find('[data-test-subj="bulkCloseRuntimeFieldWarning"]').first();
      expect(callout.exists()).toBeTruthy();
      expect(callout.text()).not.toContain(i18n.BULK_CLOSE_RUNTIME_FIELD_WARNING_UNTYPED_BODY);
    });
  });

  describe('bulk close index', () => {
    it('reports the signal index names when bulk close is checked', () => {
      const onUpdateBulkCloseIndex = jest.fn();
      mountComponent({ shouldBulkCloseAlert: true, onUpdateBulkCloseIndex });

      expect(onUpdateBulkCloseIndex).toHaveBeenLastCalledWith(['mock-siem-signals-index']);
    });

    it('reports undefined when bulk close is unchecked', () => {
      const onUpdateBulkCloseIndex = jest.fn();
      mountComponent({ shouldBulkCloseAlert: false, onUpdateBulkCloseIndex });

      expect(onUpdateBulkCloseIndex).toHaveBeenLastCalledWith(undefined);
    });
  });
});
