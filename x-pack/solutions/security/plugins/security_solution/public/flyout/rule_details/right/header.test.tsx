/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { PanelHeaderProps } from './header';
import { PanelHeader } from './header';
import { TestProvider as ExpandableFlyoutTestProvider } from '@kbn/expandable-flyout/src/test/provider';
import { TestProviders } from '../../../common/mock';
import { useRuleDetailsLink } from '../../document_details/shared/hooks/use_rule_details_link';
import type { Rule } from '../../../detection_engine/rule_management/logic';
import {
  RULE_TITLE_TEST_ID,
  RULE_CREATED_BY_TEST_ID,
  RULE_UPDATED_BY_TEST_ID,
  RULE_TITLE_SUPPRESSED_TEST_ID,
  NAVIGATE_TO_RULE_DETAILS_PAGE_TEST_ID,
} from './test_ids';

jest.mock('../../document_details/shared/hooks/use_rule_details_link');
const defaultProps = {
  rule: { id: 'id', name: 'rule' } as Rule,
  isSuppressed: false,
};

const renderRuleTitle = (props: PanelHeaderProps) =>
  render(
    <TestProviders>
      <ExpandableFlyoutTestProvider>
        <PanelHeader {...props} />
      </ExpandableFlyoutTestProvider>
    </TestProviders>
  );

describe('<RuleTitle />', () => {
  it('should render title and its components', () => {
    (useRuleDetailsLink as jest.Mock).mockReturnValue('rule_details_link');
    const { getByTestId, queryByTestId } = renderRuleTitle(defaultProps);

    expect(getByTestId(RULE_TITLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(NAVIGATE_TO_RULE_DETAILS_PAGE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RULE_CREATED_BY_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RULE_UPDATED_BY_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(RULE_TITLE_SUPPRESSED_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render deleted rule badge', () => {
    (useRuleDetailsLink as jest.Mock).mockReturnValue('rule_details_link');
    const props = {
      ...defaultProps,
      isSuppressed: true,
    };
    const { getByTestId } = renderRuleTitle(props);
    expect(getByTestId(RULE_TITLE_SUPPRESSED_TEST_ID)).toBeInTheDocument();
  });
});
