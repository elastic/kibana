/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../../common/mock';
import { REASON_TITLE_TEST_ID } from '../../../../flyout_v2/document/components/test_ids';
import { useExpandSection } from '../../../../flyout_v2/shared/hooks/use_expand_section';
import { DocumentDetailsContext } from '../../shared/context';
import { mockContextValue } from '../../shared/mocks/mock_context';
import { AboutSection } from './about_section';
import {
  ABOUT_SECTION_CONTENT_TEST_ID,
  ABOUT_SECTION_HEADER_TEST_ID,
  EVENT_CATEGORY_DESCRIPTION_TEST_ID,
  EVENT_KIND_DESCRIPTION_TEST_ID,
  EVENT_RENDERER_TEST_ID,
  MITRE_ATTACK_TITLE_TEST_ID,
  WORKFLOW_STATUS_TITLE_TEST_ID,
} from './test_ids';

jest.mock('../../../../common/components/link_to');
jest.mock('../../../../flyout_v2/shared/hooks/use_expand_section', () => ({
  useExpandSection: jest.fn(),
}));

const mockGetFieldsData: (field: string) => string = (field: string) => {
  switch (field) {
    case 'event.kind':
      return 'signal';
    default:
      return '';
  }
};

const renderAboutSection = (getFieldsData = mockGetFieldsData) => {
  const contextValue = {
    ...mockContextValue,
    getFieldsData,
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

  it('should render about section for document', async () => {
    const { getByTestId, getByText } = renderAboutSection();
    await act(async () => {
      expect(getByText('Document description')).toBeInTheDocument();
      expect(getByTestId(REASON_TITLE_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(MITRE_ATTACK_TITLE_TEST_ID)).toBeInTheDocument();
    });
  });

  it('should render event kind description if event.kind is not event', async () => {
    const _mockGetFieldsData = (field: string) => {
      switch (field) {
        case 'event.kind':
          return 'alert';
        case 'event.category':
          return 'behavior';
        default:
          return '';
      }
    };

    const { getByTestId, queryByTestId, queryByText } = renderAboutSection(_mockGetFieldsData);
    await act(async () => {
      expect(queryByText('Rule description')).not.toBeInTheDocument();
      expect(queryByTestId(REASON_TITLE_TEST_ID)).not.toBeInTheDocument();
      expect(queryByTestId(MITRE_ATTACK_TITLE_TEST_ID)).not.toBeInTheDocument();
      expect(queryByTestId(WORKFLOW_STATUS_TITLE_TEST_ID)).not.toBeInTheDocument();

      expect(getByTestId(EVENT_KIND_DESCRIPTION_TEST_ID)).toBeInTheDocument();

      expect(
        queryByTestId(`${EVENT_CATEGORY_DESCRIPTION_TEST_ID}-behavior`)
      ).not.toBeInTheDocument();

      expect(getByTestId(EVENT_RENDERER_TEST_ID)).toBeInTheDocument();
    });
  });

  it('should render event category description if event.kind is event', async () => {
    const _mockGetFieldsData = (field: string) => {
      switch (field) {
        case 'event.kind':
          return 'event';
        case 'event.category':
          return 'behavior';
        default:
          return '';
      }
    };

    const { getByTestId, queryByTestId, queryByText } = renderAboutSection(_mockGetFieldsData);
    await act(async () => {
      expect(queryByText('Rule description')).not.toBeInTheDocument();
      expect(queryByTestId(REASON_TITLE_TEST_ID)).not.toBeInTheDocument();
      expect(queryByTestId(MITRE_ATTACK_TITLE_TEST_ID)).not.toBeInTheDocument();
      expect(queryByTestId(WORKFLOW_STATUS_TITLE_TEST_ID)).not.toBeInTheDocument();

      expect(queryByTestId(EVENT_KIND_DESCRIPTION_TEST_ID)).not.toBeInTheDocument();

      expect(getByTestId(`${EVENT_CATEGORY_DESCRIPTION_TEST_ID}-behavior`)).toBeInTheDocument();

      expect(getByTestId(EVENT_RENDERER_TEST_ID)).toBeInTheDocument();
    });
  });
});
