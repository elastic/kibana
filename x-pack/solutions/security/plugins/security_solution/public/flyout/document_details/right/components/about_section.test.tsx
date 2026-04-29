/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../../common/mock';
import {
  EVENT_CATEGORY_DESCRIPTION_TEST_ID,
  EVENT_KIND_DESCRIPTION_TEST_ID,
  EVENT_RENDERER_TEST_ID,
  MITRE_ATTACK_TITLE_TEST_ID,
  REASON_TITLE_TEST_ID,
  RULE_SUMMARY_BUTTON_TEST_ID,
} from '../../../../flyout_v2/document/components/test_ids';
import { useExpandSection } from '../../../../flyout_v2/shared/hooks/use_expand_section';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { DocumentDetailsContext } from '../../shared/context';
import { mockContextValue } from '../../shared/mocks/mock_context';
import { AboutSection } from './about_section';
import {
  ABOUT_SECTION_CONTENT_TEST_ID,
  ABOUT_SECTION_HEADER_TEST_ID,
  WORKFLOW_STATUS_TITLE_TEST_ID,
} from './test_ids';
import { mockSearchHit } from '../../shared/mocks/mock_search_hit';
import { EventKind } from '../../../../flyout_v2/document/constants/event_kinds';

jest.mock('../../../../common/components/link_to');
jest.mock('../../../../flyout_v2/shared/hooks/use_expand_section', () => ({
  useExpandSection: jest.fn(),
}));
jest.mock('../../../../common/components/user_privileges');

const renderAboutSection = (searchHit = mockSearchHit) => {
  const contextValue = {
    ...mockContextValue,
    indexName: searchHit._index,
    searchHit,
  };
  return render(
    <TestProviders>
      <DocumentDetailsContext.Provider value={contextValue}>
        <AboutSection />
      </DocumentDetailsContext.Provider>
    </TestProviders>
  );
};

describe('<AboutSection />', () => {
  const mockUseExpandSection = jest.mocked(useExpandSection);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseExpandSection.mockReturnValue(true);
  });

  it('should render about component', async () => {
    const { getByTestId } = renderAboutSection();

    await act(async () => {
      expect(getByTestId(ABOUT_SECTION_HEADER_TEST_ID)).toHaveTextContent('About');
      expect(getByTestId(ABOUT_SECTION_CONTENT_TEST_ID)).toBeInTheDocument();
    });
  });

  it('should render the component collapsed if value is false in local storage', async () => {
    mockUseExpandSection.mockReturnValue(false);

    const { getByTestId } = renderAboutSection();

    await act(async () => {
      expect(getByTestId(ABOUT_SECTION_CONTENT_TEST_ID)).not.toBeVisible();
    });
  });

  it('should render the component expanded if value is true in local storage', async () => {
    const { getByTestId } = renderAboutSection();

    await act(async () => {
      expect(getByTestId(ABOUT_SECTION_CONTENT_TEST_ID)).toBeVisible();
    });
  });

  it('should render alert related UI when event.kind is signal', async () => {
    const customMockSearchHit = {
      ...mockSearchHit,
      fields: {
        ...mockSearchHit.fields,
        'event.kind': [EventKind.signal],
      },
    };

    const { getByTestId, getByText, queryByTestId } = renderAboutSection(customMockSearchHit);

    await act(async () => {
      expect(getByText('Rule description')).toBeInTheDocument();
      expect(getByTestId(REASON_TITLE_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(MITRE_ATTACK_TITLE_TEST_ID)).toBeInTheDocument();
      expect(queryByTestId(WORKFLOW_STATUS_TITLE_TEST_ID)).not.toBeInTheDocument();

      expect(queryByTestId(EVENT_KIND_DESCRIPTION_TEST_ID)).not.toBeInTheDocument();
      expect(
        queryByTestId(`${EVENT_CATEGORY_DESCRIPTION_TEST_ID}-behavior`)
      ).not.toBeInTheDocument();
      expect(queryByTestId(EVENT_RENDERER_TEST_ID)).not.toBeInTheDocument();
    });
  });

  it('should render event related UI when event.kind is event', async () => {
    const { getByText } = renderAboutSection();

    await act(async () => {
      expect(getByText('Event renderer')).toBeInTheDocument();
    });
  });

  describe('rule summary button', () => {
    beforeEach(() => {
      (useUserPrivileges as jest.Mock).mockReturnValue({
        rulesPrivileges: { rules: { read: true } },
      });
    });

    it('should disable the rule summary button for a remote alert', async () => {
      const remoteAlertSearchHit = {
        ...mockSearchHit,
        _index: 'remote-cluster:.alerts-security.alerts-default',
        fields: {
          ...mockSearchHit.fields,
          'event.kind': [EventKind.signal],
        },
      };

      const { getByTestId } = renderAboutSection(remoteAlertSearchHit);

      await act(async () => {
        expect(getByTestId(RULE_SUMMARY_BUTTON_TEST_ID)).toHaveAttribute('disabled');
      });
    });

    it('should enable the rule summary button for a local alert', async () => {
      const localAlertSearchHit = {
        ...mockSearchHit,
        fields: {
          ...mockSearchHit.fields,
          'event.kind': [EventKind.signal],
        },
      };

      const { getByTestId } = renderAboutSection(localAlertSearchHit);

      await act(async () => {
        expect(getByTestId(RULE_SUMMARY_BUTTON_TEST_ID)).not.toHaveAttribute('disabled');
      });
    });
  });
});
