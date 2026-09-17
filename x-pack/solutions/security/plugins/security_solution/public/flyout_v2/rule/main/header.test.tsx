/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { HeaderProps } from './header';
import { Header } from './header';
import { TestProviders } from '../../../common/mock';
import { useRuleDetailsLink } from './hooks/use_rule_details_link';
import { useRuleAuthorDisplayNames } from '../../../detection_engine/rule_management/logic/use_rule_author_display_names';
import type { RuleResponse } from '../../../../common/api/detection_engine';
import {
  RULE_DETAILS_TITLE_TEST_ID,
  RULE_DETAILS_TITLE_LINK_TEST_ID,
  RULE_DETAILS_SUPPRESSED_TEST_ID,
  RULE_DETAILS_CREATED_BY_TEST_ID,
  RULE_DETAILS_UPDATED_BY_TEST_ID,
} from './test_ids';

jest.mock('./hooks/use_rule_details_link');
jest.mock('../../../detection_engine/rule_management/logic/use_rule_author_display_names');

const defaultProps: HeaderProps = {
  rule: { id: 'id', name: 'rule name' } as RuleResponse,
  isSuppressed: false,
};

const renderHeader = (props: HeaderProps = defaultProps) =>
  render(
    <TestProviders>
      <Header {...props} />
    </TestProviders>
  );

describe('<Header />', () => {
  beforeEach(() => {
    (useRuleAuthorDisplayNames as jest.Mock).mockReturnValue({});
  });

  it('should render title with link when href is available', () => {
    (useRuleDetailsLink as jest.Mock).mockReturnValue('rule_details_link');
    const { getByTestId, queryByTestId } = renderHeader();

    expect(getByTestId(`${RULE_DETAILS_TITLE_TEST_ID}Text`)).toBeInTheDocument();
    expect(getByTestId(RULE_DETAILS_TITLE_LINK_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RULE_DETAILS_CREATED_BY_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RULE_DETAILS_UPDATED_BY_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(RULE_DETAILS_SUPPRESSED_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render title without link when href is not available', () => {
    (useRuleDetailsLink as jest.Mock).mockReturnValue(null);
    const { getByTestId, queryByTestId } = renderHeader();

    expect(getByTestId(RULE_DETAILS_TITLE_TEST_ID)).toHaveTextContent('rule name');
    expect(queryByTestId(RULE_DETAILS_TITLE_LINK_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render deleted rule badge when suppressed', () => {
    (useRuleDetailsLink as jest.Mock).mockReturnValue('rule_details_link');
    const { getByTestId } = renderHeader({ ...defaultProps, isSuppressed: true });

    expect(getByTestId(RULE_DETAILS_SUPPRESSED_TEST_ID)).toBeInTheDocument();
  });

  it('should render the resolved display names of the rule authors', () => {
    (useRuleDetailsLink as jest.Mock).mockReturnValue('rule_details_link');
    (useRuleAuthorDisplayNames as jest.Mock).mockReturnValue({
      createdBy: 'Rule Creator',
      updatedBy: 'Rule Updater',
    });
    const { getByTestId } = renderHeader({
      ...defaultProps,
      rule: {
        ...defaultProps.rule,
        created_by: '1234567890',
        created_by_profile_uid: 'created-uid',
        updated_by: '0987654321',
        updated_by_profile_uid: 'updated-uid',
      },
    });

    expect(useRuleAuthorDisplayNames as jest.Mock).toHaveBeenCalledWith({
      createdBy: '1234567890',
      createdByProfileUid: 'created-uid',
      updatedBy: '0987654321',
      updatedByProfileUid: 'updated-uid',
    });
    expect(getByTestId(RULE_DETAILS_CREATED_BY_TEST_ID)).toHaveTextContent('Rule Creator');
    expect(getByTestId(RULE_DETAILS_UPDATED_BY_TEST_ID)).toHaveTextContent('Rule Updater');
  });
});
