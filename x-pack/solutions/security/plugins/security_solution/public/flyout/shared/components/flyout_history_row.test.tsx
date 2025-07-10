/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import {
  DocumentDetailsHistoryRow,
  FlyoutHistoryRow,
  GenericHistoryRow,
  RuleHistoryRow,
} from './flyout_history_row';
import { TestProviders } from '../../../common/mock';
import type { RuleResponse } from '../../../../common/api/detection_engine';
import {
  type ExpandableFlyoutApi,
  type FlyoutPanelHistory,
  useExpandableFlyoutApi,
} from '@kbn/expandable-flyout';
import { useRuleDetails } from '../../rule_details/hooks/use_rule_details';
import { useBasicDataFromDetailsData } from '../../document_details/shared/hooks/use_basic_data_from_details_data';
import { useEventDetails } from '../../document_details/shared/hooks/use_event_details';
import { DocumentDetailsRightPanelKey } from '../../document_details/shared/constants/panel_keys';
import { RulePanelKey } from '../../rule_details/right';
import { NetworkPanelKey } from '../../network_details';
import {
  DOCUMENT_DETAILS_HISTORY_ROW_TEST_ID,
  GENERIC_HISTORY_ROW_TEST_ID,
  HOST_HISTORY_ROW_TEST_ID,
  NETWORK_HISTORY_ROW_TEST_ID,
  RULE_HISTORY_ROW_TEST_ID,
  USER_HISTORY_ROW_TEST_ID,
  HISTORY_ROW_LOADING_TEST_ID,
} from './test_ids';
import { HostPanelKey, UserPanelKey } from '../../entity_details/shared/constants';

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: jest.fn(),
  useExpandableFlyoutState: jest.fn(),
  useExpandableFlyoutHistory: jest.fn(),
  ExpandableFlyoutProvider: ({ children }: React.PropsWithChildren<{}>) => <>{children}</>,
}));

jest.mock('../../../detection_engine/rule_management/logic/use_rule_with_fallback');
jest.mock('../../document_details/shared/hooks/use_basic_data_from_details_data');
jest.mock('../../rule_details/hooks/use_rule_details');
jest.mock('../../document_details/shared/hooks/use_event_details');

const flyoutContextValue = {
  openFlyout: jest.fn(),
} as unknown as ExpandableFlyoutApi;

const rowItems: { [id: string]: FlyoutPanelHistory } = {
  alert: {
    lastOpen: Date.now(),
    panel: {
      id: DocumentDetailsRightPanelKey,
      params: {
        id: 'eventId',
        indexName: 'indexName',
        scopeId: 'scopeId',
      },
    },
  },
  rule: {
    lastOpen: Date.now(),
    panel: {
      id: RulePanelKey,
      params: { ruleId: 'ruleId' },
    },
  },
  host: {
    lastOpen: Date.now(),
    panel: {
      id: HostPanelKey,
      params: { hostName: 'host name' },
    },
  },
  user: {
    lastOpen: Date.now(),
    panel: {
      id: UserPanelKey,
      params: { userName: 'user name' },
    },
  },
  network: {
    lastOpen: Date.now(),
    panel: {
      id: NetworkPanelKey,
      params: { ip: 'ip' },
    },
  },
  unsupported: {
    lastOpen: Date.now(),
    panel: {
      id: 'key',
    },
  },
};

const mockedRuleResponse = {
  rule: null,
  loading: false,
  isExistingRule: false,
  error: null,
  refresh: jest.fn(),
};

describe('FlyoutHistoryRow', () => {
  beforeEach(() => {
    jest.mocked(useExpandableFlyoutApi).mockReturnValue(flyoutContextValue);
    jest.mocked(useRuleDetails).mockReturnValue({
      ...mockedRuleResponse,
      rule: { name: 'rule name' } as RuleResponse,
      loading: false,
    });
    (useEventDetails as jest.Mock).mockReturnValue({
      dataFormattedForFieldBrowser: {},
      getFieldsData: jest.fn(),
      loading: false,
    });
    (useBasicDataFromDetailsData as jest.Mock).mockReturnValue({ isAlert: false });
  });

  it('should render document details history row when key is alert', () => {
    (useBasicDataFromDetailsData as jest.Mock).mockReturnValue({
      isAlert: true,
      ruleName: 'rule name',
    });

    const { getByTestId } = render(
      <TestProviders>
        <FlyoutHistoryRow item={rowItems.alert} index={0} />
      </TestProviders>
    );
    expect(getByTestId(`${0}-${DOCUMENT_DETAILS_HISTORY_ROW_TEST_ID}`)).toBeInTheDocument();
  });

  it('should render rule history row when key is rule', () => {
    const { getByTestId } = render(
      <TestProviders>
        <FlyoutHistoryRow item={rowItems.rule} index={1} />
      </TestProviders>
    );
    expect(getByTestId(`${1}-${RULE_HISTORY_ROW_TEST_ID}`)).toBeInTheDocument();
  });

  it('should render generic host history row when key is host', () => {
    const { getByTestId } = render(
      <TestProviders>
        <FlyoutHistoryRow item={rowItems.host} index={2} />
      </TestProviders>
    );
    expect(getByTestId(`${2}-${HOST_HISTORY_ROW_TEST_ID}`)).toBeInTheDocument();
    expect(getByTestId(`${2}-${HOST_HISTORY_ROW_TEST_ID}`)).toHaveTextContent('Host: host name');
  });

  it('should render generic user history row when key is user', () => {
    const { getByTestId } = render(
      <TestProviders>
        <FlyoutHistoryRow item={rowItems.user} index={3} />
      </TestProviders>
    );
    expect(getByTestId(`${3}-${USER_HISTORY_ROW_TEST_ID}`)).toBeInTheDocument();
    expect(getByTestId(`${3}-${USER_HISTORY_ROW_TEST_ID}`)).toHaveTextContent('User: user name');
  });

  it('should render generic network history row when key is network', () => {
    const { getByTestId } = render(
      <TestProviders>
        <FlyoutHistoryRow item={rowItems.network} index={4} />
      </TestProviders>
    );
    expect(getByTestId(`${4}-${NETWORK_HISTORY_ROW_TEST_ID}`)).toBeInTheDocument();
    expect(getByTestId(`${4}-${NETWORK_HISTORY_ROW_TEST_ID}`)).toHaveTextContent('Network: ip');
  });

  it('should render null when key is not supported', () => {
    const { container } = render(
      <TestProviders>
        <FlyoutHistoryRow item={rowItems.unsupported} index={5} />
      </TestProviders>
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('DocumentDetailsHistoryRow', () => {
  beforeEach(() => {
    jest.mocked(useExpandableFlyoutApi).mockReturnValue(flyoutContextValue);
    (useEventDetails as jest.Mock).mockReturnValue({
      dataFormattedForFieldBrowser: {},
      getFieldsData: jest.fn(),
      loading: false,
    });
  });

  it('should render alert title when isAlert is true and rule name is defined', () => {
    (useBasicDataFromDetailsData as jest.Mock).mockReturnValue({
      isAlert: true,
      ruleName: 'rule name',
    });

    const { getByTestId } = render(
      <TestProviders>
        <DocumentDetailsHistoryRow item={rowItems.alert} index={0} />
      </TestProviders>
    );
    expect(getByTestId(`${0}-${DOCUMENT_DETAILS_HISTORY_ROW_TEST_ID}`)).toHaveTextContent(
      'Alert: rule name'
    );
  });

  it('should render default alert title when isAlert is true and rule name is undefined', () => {
    (useBasicDataFromDetailsData as jest.Mock).mockReturnValue({ isAlert: true });

    const { getByTestId } = render(
      <TestProviders>
        <DocumentDetailsHistoryRow item={rowItems.alert} index={0} />
      </TestProviders>
    );
    expect(getByTestId(`${0}-${DOCUMENT_DETAILS_HISTORY_ROW_TEST_ID}`)).toHaveTextContent(
      'Alert: Document details'
    );
  });

  it('should render event title when isAlert is false', () => {
    (useBasicDataFromDetailsData as jest.Mock).mockReturnValue({ isAlert: false });

    const { getByTestId } = render(
      <TestProviders>
        <DocumentDetailsHistoryRow item={rowItems.alert} index={0} />
      </TestProviders>
    );
    expect(getByTestId(`${0}-${DOCUMENT_DETAILS_HISTORY_ROW_TEST_ID}`)).toHaveTextContent(
      'Event details'
    );
  });

  it('should open document details flyout when clicked', () => {
    (useBasicDataFromDetailsData as jest.Mock).mockReturnValue({ isAlert: true });

    const { getByTestId } = render(
      <TestProviders>
        <DocumentDetailsHistoryRow item={rowItems.alert} index={0} />
      </TestProviders>
    );
    fireEvent.click(getByTestId(`${0}-${DOCUMENT_DETAILS_HISTORY_ROW_TEST_ID}`));
    expect(flyoutContextValue.openFlyout).toHaveBeenCalledWith({ right: rowItems.alert.panel });
  });
});

describe('RuleHistoryRow', () => {
  beforeEach(() => {
    jest.mocked(useExpandableFlyoutApi).mockReturnValue(flyoutContextValue);
    jest.mocked(useRuleDetails).mockReturnValue({
      rule: { name: 'rule name' } as RuleResponse,
      loading: false,
      isExistingRule: false,
    });
  });

  it('should render the rule row component', () => {
    const { getByTestId } = render(
      <TestProviders>
        <RuleHistoryRow item={rowItems.rule} index={0} />
      </TestProviders>
    );
    expect(getByTestId(`${0}-${RULE_HISTORY_ROW_TEST_ID}`)).toHaveTextContent('Rule: rule name');
    expect(useRuleDetails).toHaveBeenCalledWith({ ruleId: rowItems.rule.panel.params?.ruleId });
  });

  it('should open rule details flyout when clicked', () => {
    const { getByTestId } = render(
      <TestProviders>
        <RuleHistoryRow item={rowItems.rule} index={0} />
      </TestProviders>
    );
    fireEvent.click(getByTestId(`${0}-${RULE_HISTORY_ROW_TEST_ID}`));
    expect(flyoutContextValue.openFlyout).toHaveBeenCalledWith({ right: rowItems.rule.panel });
  });
});

describe('GenericHistoryRow', () => {
  beforeEach(() => {
    jest.mocked(useExpandableFlyoutApi).mockReturnValue(flyoutContextValue);
  });

  it('should render the generic row component', () => {
    const { getByTestId } = render(
      <TestProviders>
        <GenericHistoryRow
          item={rowItems.host}
          name="Row name"
          icon={'user'}
          title="title"
          index={0}
        />
      </TestProviders>
    );
    expect(getByTestId(`${0}-${GENERIC_HISTORY_ROW_TEST_ID}`)).toHaveTextContent('Row name: title');
    fireEvent.click(getByTestId(`${0}-${GENERIC_HISTORY_ROW_TEST_ID}`));
  });

  it('should render empty context menu item when isLoading is true', () => {
    const { getByTestId } = render(
      <TestProviders>
        <GenericHistoryRow
          item={rowItems.host}
          name="Row name"
          icon={'user'}
          title="title"
          index={0}
          isLoading
        />
      </TestProviders>
    );
    expect(getByTestId(HISTORY_ROW_LOADING_TEST_ID)).toBeInTheDocument();
  });

  it('should open the flyout when clicked', () => {
    const { getByTestId } = render(
      <TestProviders>
        <GenericHistoryRow
          item={rowItems.host}
          name="Row name"
          icon={'user'}
          title="title"
          index={0}
        />
      </TestProviders>
    );
    fireEvent.click(getByTestId(`${0}-${GENERIC_HISTORY_ROW_TEST_ID}`));
    expect(flyoutContextValue.openFlyout).toHaveBeenCalledWith({ right: rowItems.host.panel });
  });
});
