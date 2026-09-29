/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { act, render } from '@testing-library/react';
import {
  INVESTIGATION_SECTION_CONTENT_TEST_ID,
  INVESTIGATION_SECTION_HEADER_TEST_ID,
} from './test_ids';
import { INVESTIGATION_GUIDE_TEST_ID } from '../../../../flyout_v2/document/main/components/test_ids';
import { DocumentDetailsContext } from '../../shared/context';
import { InvestigationSection } from './investigation_section';
import { mockDataFormattedForFieldBrowser } from '../../shared/mocks/mock_data_formatted_for_field_browser';
import { TestProvider } from '@kbn/expandable-flyout/src/test/provider';
import { mockContextValue } from '../../shared/mocks/mock_context';
import { useExpandSection } from '../../../../flyout_v2/shared/hooks/use_expand_section';
import { useHighlightedFields } from '../../../../flyout_v2/document/main/hooks/use_highlighted_fields';
import { useRuleDetails } from '../../../../flyout_v2/rule/main/hooks/use_rule_details';
import type { RuleResponse } from '../../../../../common/api/detection_engine';
import { useHighlightedFieldsPrivilege } from '../../../../flyout_v2/document/main/hooks/use_highlighted_fields_privilege';
import type { UseBasicDataFromDetailsDataResult } from '../../shared/hooks/use_basic_data_from_details_data';
import { useBasicDataFromDetailsData } from '../../shared/hooks/use_basic_data_from_details_data';
import { useRuleWithFallback } from '../../../../detection_engine/rule_management/logic/use_rule_with_fallback';
import { useEntityFromStore } from '../../../entity_details/shared/hooks/use_entity_from_store';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';

vi.mock('@kbn/kibana-react-plugin/public', async () => {
  const actual = await vi.importActual('@kbn/kibana-react-plugin/public');
  return {
    ...actual,
    useUiSetting: vi.fn(),
  };
});

vi.mock('@kbn/entity-store/public', async () => {
  const actual = await vi.importActual('@kbn/entity-store/public');
  const { euid } = await vi.importActual('@kbn/entity-store/common/euid_helpers');
  return {
    ...actual,
    useEntityStoreEuidApi: vi.fn(() => ({ euid })),
  };
});

vi.mock('../../../entity_details/shared/hooks/use_entity_from_store');

vi.mock('../../../../flyout_v2/shared/hooks/use_expand_section', () => {
  const mocked = {
    useExpandSection: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../../flyout_v2/document/main/hooks/use_highlighted_fields');
vi.mock('../../../../common/hooks/use_experimental_features');
vi.mock('../../../../flyout_v2/rule/main/hooks/use_rule_details');
vi.mock('../../../../flyout_v2/document/main/hooks/use_highlighted_fields_privilege');
vi.mock('../../shared/hooks/use_basic_data_from_details_data');
vi.mock('../../../../detection_engine/rule_management/logic/use_rule_with_fallback');
vi.mock('../../shared/hooks/use_navigate_to_left_panel', () => {
  const mocked = {
    useNavigateToLeftPanel: () => vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../common/lib/kibana', async () => {
  const actual = await vi.importActual('../../../../common/lib/kibana');
  return {
    ...actual,
    useUiSetting: vi.fn().mockReturnValue(false),
  };
});

const mockAddSuccess = vi.fn();
vi.mock('../../../../common/hooks/use_app_toasts', () => {
  const mocked = {
    useAppToasts: () => ({
      addSuccess: mockAddSuccess,
    }),
  };
  return { ...mocked, default: mocked };
});

const panelContextValue = {
  ...mockContextValue,
  dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser.filter(
    (d) => d.field !== 'kibana.alert.rule.type'
  ),
};

const mockBasicAlertData: UseBasicDataFromDetailsDataResult = {
  agentId: '',
  alertId: '',
  alertUrl: '',
  data: null,
  hostName: '',
  indexName: '',
  isAlert: true,
  ruleDescription: '',
  ruleId: 'ruleId',
  ruleName: '',
  timestamp: '',
  userName: '',
};

const renderInvestigationSection = (contextValue = panelContextValue) =>
  render(
    <TestProvider>
      <DocumentDetailsContext.Provider value={contextValue}>
        <InvestigationSection />
      </DocumentDetailsContext.Provider>
    </TestProvider>
  );

describe('<InvestigationSection />', () => {
  const mockUseExpandSection = vi.mocked(useExpandSection);
  const mockUseEntityFromStore = useEntityFromStore as Mock;
  const mockUseUiSetting = useUiSetting as Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUiSetting.mockReturnValue(false);
    mockUseEntityFromStore.mockReturnValue({
      entityRecord: null,
      entity: null,
      firstSeen: null,
      lastSeen: null,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseExpandSection.mockReturnValue(true);
    (useExpandSection as Mock).mockReturnValue(true);
    (useHighlightedFields as Mock).mockReturnValue([]);
    (useRuleDetails as Mock).mockReturnValue({
      rule: { id: '123' } as RuleResponse,
      isExistingRule: true,
      loading: false,
    });
    (useHighlightedFieldsPrivilege as Mock).mockReturnValue({
      isDisabled: false,
      tooltipContent: 'tooltip content',
    });
    (useBasicDataFromDetailsData as Mock).mockReturnValue(mockBasicAlertData);
    (useRuleWithFallback as Mock).mockReturnValue({
      loading: false,
      error: false,
      rule: { note: 'test note' },
    });
  });

  it('should render investigation component top level items', async () => {
    const { getByTestId } = renderInvestigationSection();

    await act(async () => {
      expect(getByTestId(INVESTIGATION_SECTION_HEADER_TEST_ID)).toHaveTextContent('Investigation');
      expect(getByTestId(INVESTIGATION_SECTION_CONTENT_TEST_ID)).toBeInTheDocument();
    });
  });

  it('should render the component collapsed if value is false in local storage', async () => {
    mockUseExpandSection.mockReturnValue(false);

    const { getByTestId } = renderInvestigationSection();

    await act(async () => {
      expect(getByTestId(INVESTIGATION_SECTION_CONTENT_TEST_ID)).not.toBeVisible();
    });
  });

  it('should render the component expanded if value is true in local storage', async () => {
    const { getByTestId } = renderInvestigationSection();

    await act(async () => {
      expect(getByTestId(INVESTIGATION_SECTION_CONTENT_TEST_ID)).toBeVisible();
    });
  });

  it('should render investigation guide and highlighted fields when document is signal', async () => {
    const { getByTestId } = renderInvestigationSection();

    await act(async () => {
      expect(getByTestId(INVESTIGATION_GUIDE_TEST_ID)).toBeInTheDocument();
    });
  });

  it('should not render investigation guide when document is a remote alert', async () => {
    const { queryByTestId } = renderInvestigationSection({
      ...panelContextValue,
      indexName: 'remote-cluster:index-name',
      searchHit: { ...panelContextValue.searchHit, _index: 'remote-cluster:index-name' },
    });

    await act(async () => {
      expect(queryByTestId(INVESTIGATION_GUIDE_TEST_ID)).not.toBeInTheDocument();
    });
  });

  it('should not render investigation guide when document is not signal', async () => {
    const mockGetFieldsData = (field: string) => {
      switch (field) {
        case 'event.kind':
          return 'alert';
      }
    };

    const { queryByTestId } = renderInvestigationSection({
      ...panelContextValue,
      getFieldsData: mockGetFieldsData,
    });

    await act(async () => {
      expect(queryByTestId(INVESTIGATION_GUIDE_TEST_ID)).not.toBeInTheDocument();
    });
  });
});
