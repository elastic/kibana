/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { EuiProvider } from '@elastic/eui';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import type { AppMenuPrimaryActionItem } from '@kbn/app-menu';
import { RuleFormAppHeader } from '.';

jest.mock('../../../common/components/app_header/use_add_integrations_menu_item', () => ({
  useAddIntegrationsMenuItem: () => undefined,
}));
jest.mock('../../../common/components/app_header/use_ml_job_settings_menu_item', () => ({
  useMlJobSettingsMenuItem: () => ({ item: undefined, flyout: null }),
}));

const back = { label: 'Rules', href: '/app/security/rules' };

const renderHeader = (props: Partial<React.ComponentProps<typeof RuleFormAppHeader>> = {}) =>
  render(
    <EuiProvider highContrastMode={false}>
      <MemoryRouter>
        <MockAppHeaderProvider>
          <RuleFormAppHeader
            title="Create new rule"
            back={back}
            isRulePreviewVisible={true}
            onToggleRulePreview={jest.fn()}
            {...props}
          />
        </MockAppHeaderProvider>
      </MemoryRouter>
    </EuiProvider>
  );

describe('RuleFormAppHeader', () => {
  it('renders the title and the back link', () => {
    renderHeader();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Create new rule');
    const backLink = screen.getByTestId(APP_HEADER_TEST_SUBJECTS.back);
    expect(backLink).toHaveAttribute('href', back.href);
    expect(backLink).toHaveAttribute('aria-label', 'Back to Rules');
  });

  it('toggles the rule preview', async () => {
    const onToggleRulePreview = jest.fn();
    renderHeader({ onToggleRulePreview });

    await openAppMenuOverflow();
    await userEvent.click(screen.getByTestId('preview-container'));

    expect(onToggleRulePreview).toHaveBeenCalledTimes(1);
  });

  it('renders "Add to chat" as the primary action when provided', async () => {
    const run = jest.fn();
    const addToChatAction: AppMenuPrimaryActionItem = {
      id: 'addRuleToChat',
      label: 'Add to chat',
      iconType: 'productAgent',
      run,
      testId: 'newAgentBuilderAttachment',
    };
    renderHeader({ addToChatAction });

    // The primary action stays visible outside the "More" menu.
    await userEvent.click(screen.getByTestId('newAgentBuilderAttachment'));

    expect(run).toHaveBeenCalledTimes(1);
  });

  it('renders the provided tabs and reports tab clicks', async () => {
    const onClick = jest.fn();
    renderHeader({
      tabs: [
        { id: 'define', label: 'Definition', isSelected: true, 'data-test-subj': 'defineTab' },
        { id: 'about', label: 'About', onClick, 'data-test-subj': 'aboutTab' },
      ],
    });

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.tabs)).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('aboutTab'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not render "Add to chat" when not provided', () => {
    renderHeader();

    expect(screen.queryByTestId('newAgentBuilderAttachment')).not.toBeInTheDocument();
  });
});
