/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { FleetPackagePolicyGenerator } from '../../../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import { createAppRootMockRenderer } from '../../../../../../common/mock/endpoint';
import { getPolicySettingsFormTestSubjects } from '../mocks';
import { AdvancedSection } from './advanced_section';
import type { AdvancedSectionProps } from './advanced_section';

jest.mock('../../../../../../common/hooks/use_license');
jest.setTimeout(15_000);

describe('Policy Advanced Settings section chrome', () => {
  const testSubj = getPolicySettingsFormTestSubjects('test').advancedSection;

  const renderSection = (props: Partial<AdvancedSectionProps> = {}) => {
    const mockedContext = createAppRootMockRenderer();
    const policy = new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy().inputs[0]
      .config.policy.value;

    return mockedContext.render(
      <AdvancedSection
        policy={policy}
        onChange={jest.fn()}
        mode="edit"
        data-test-subj={testSubj.container}
        {...props}
      />
    );
  };

  const getToggle = (
    renderResult: ReturnType<ReturnType<typeof createAppRootMockRenderer>['render']>
  ) => renderResult.getByTestId(testSubj.showHideButton);

  it('renders the legacy inline button without the full-width styling hook when the prop is omitted', () => {
    const renderResult = renderSection();
    const toggle = getToggle(renderResult);

    expect(toggle.querySelector('[data-euiicon-type="chevronSingleDown"]')).not.toBeInTheDocument();
    expect(toggle.querySelector('[data-euiicon-type="chevronSingleUp"]')).not.toBeInTheDocument();
  });

  // The jsdom `EuiIcon` mock echoes any `iconType` string onto `data-euiicon-type` without
  // checking it is a real icon, which is how `arrowUp`/`arrowDown` shipped rendering nothing.
  // Asserting the exact name at least pins the one that was verified in a browser.
  it('renders a full-width toggle with a chevron when fullWidthToggle is true', async () => {
    const renderResult = renderSection({ fullWidthToggle: true });
    const toggle = getToggle(renderResult);

    expect(toggle.querySelector('[data-euiicon-type]')).toHaveAttribute(
      'data-euiicon-type',
      'chevronSingleDown'
    );

    await userEvent.click(toggle);

    expect(getToggle(renderResult).querySelector('[data-euiicon-type]')).toHaveAttribute(
      'data-euiicon-type',
      'chevronSingleUp'
    );
  });

  it('sets aria-expanded to false when collapsed and true after click', async () => {
    const renderResult = renderSection();
    const toggle = getToggle(renderResult);

    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(toggle);

    expect(getToggle(renderResult)).toHaveAttribute('aria-expanded', 'true');
  });

  it('omits aria-controls while collapsed and points it at the rendered region once expanded', async () => {
    const renderResult = renderSection();
    const toggle = getToggle(renderResult);

    expect(toggle).not.toHaveAttribute('aria-controls');

    await userEvent.click(toggle);

    const controlsId = getToggle(renderResult).getAttribute('aria-controls');
    expect(controlsId).toBeTruthy();

    expect(renderResult.container.querySelector(`#${CSS.escape(controlsId!)}`)).toBeInTheDocument();
  });
});
