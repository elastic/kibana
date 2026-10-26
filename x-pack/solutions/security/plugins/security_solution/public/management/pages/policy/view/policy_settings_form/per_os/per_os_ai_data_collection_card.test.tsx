/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { cloneDeep } from 'lodash';
import type { AppContextTestRender } from '../../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../../common/mock/endpoint';
import { FleetPackagePolicyGenerator } from '../../../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import type { PolicyConfig } from '../../../../../../../common/endpoint/types';
import { PolicyOperatingSystem } from '../../../../../../../common/endpoint/types';
import { expectIsViewOnly, getPolicySettingsFormTestSubjects } from '../mocks';
import type { PerOsAiDataCollectionCardProps } from './per_os_ai_data_collection_card';
import {
  PER_OS_AI_DATA_COLLECTION_CARD_TITLE,
  PerOsAiDataCollectionCard,
} from './per_os_ai_data_collection_card';

const OS_KEYS = ['windows', 'mac', 'linux'] as const;

describe('PerOsAiDataCollectionCard', () => {
  const testSubj = getPolicySettingsFormTestSubjects('test').perOsAiDataCollection;
  let policy: PolicyConfig;
  let props: PerOsAiDataCollectionCardProps;
  let mockedContext: ReturnType<typeof createAppRootMockRenderer>;
  let renderResult: ReturnType<AppContextTestRender['render']>;

  const render = () => {
    renderResult = mockedContext.render(<PerOsAiDataCollectionCard {...props} policy={policy} />);
    return renderResult;
  };

  const getUpdatedPolicy = (): PolicyConfig => {
    const onChange = props.onChange as jest.Mock;
    return onChange.mock.calls[onChange.mock.calls.length - 1][0].updatedPolicy;
  };

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    policy = new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy().inputs[0]
      .config.policy.value;
    props = {
      policy,
      onChange: jest.fn(),
      mode: 'edit',
      'data-test-subj': testSubj.card,
    };
  });

  it('renders the title, the Technical preview badge, and the description', () => {
    render();

    expect(renderResult.getByRole('heading', { level: 4 })).toHaveTextContent(
      PER_OS_AI_DATA_COLLECTION_CARD_TITLE
    );
    expect(renderResult.getByTestId(testSubj.technicalPreviewBadge)).toHaveTextContent(
      'Technical Preview'
    );
    expect(
      renderResult.getByText(
        'Identify AI tools and add that context to events that Elastic Defend collects from them. This improves visibility into AI activity on your hosts.'
      )
    ).toBeInTheDocument();
  });

  it('renders the supported agent version notice', () => {
    render();

    expect(renderResult.getByTestId(testSubj.supportedVersion)).toHaveTextContent(
      'Agent version 9.6+'
    );
  });

  it('renders one row per OS, in Windows, macOS, Linux order', () => {
    render();

    const rows = renderResult.getAllByRole('group');

    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining('Windows'),
      expect.stringContaining('Mac'),
      expect.stringContaining('Linux'),
    ]);
  });

  it.each(OS_KEYS)('reflects the %s policy value when enabled', (osKey) => {
    policy[PolicyOperatingSystem[osKey]].ai_data_collection = { enabled: true };
    render();

    expect(renderResult.getByTestId(testSubj[osKey].enableDisableSwitch)).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it.each(OS_KEYS)('treats a missing %s ai_data_collection block as off', (osKey) => {
    delete policy[PolicyOperatingSystem[osKey]].ai_data_collection;
    render();

    expect(renderResult.getByTestId(testSubj[osKey].enableDisableSwitch)).toHaveAttribute(
      'aria-checked',
      'false'
    );
  });

  it('toggling Windows only changes the windows.ai_data_collection block', async () => {
    policy.windows.ai_data_collection = { enabled: false };
    const macBefore = cloneDeep(policy.mac);
    const linuxBefore = cloneDeep(policy.linux);
    render();

    await userEvent.click(renderResult.getByTestId(testSubj.windows.enableDisableSwitch));

    const updatedPolicy = getUpdatedPolicy();
    expect(updatedPolicy.windows.ai_data_collection).toEqual({ enabled: true });
    expect(updatedPolicy.mac).toEqual(macBefore);
    expect(updatedPolicy.linux).toEqual(linuxBefore);
  });

  it('creates the ai_data_collection block for an OS that is missing it', async () => {
    delete policy.mac.ai_data_collection;
    const windowsBefore = cloneDeep(policy.windows);
    const linuxBefore = cloneDeep(policy.linux);
    render();

    await userEvent.click(renderResult.getByTestId(testSubj.mac.enableDisableSwitch));

    const updatedPolicy = getUpdatedPolicy();
    expect(updatedPolicy.mac.ai_data_collection).toEqual({ enabled: true });
    expect(updatedPolicy.windows).toEqual(windowsBefore);
    expect(updatedPolicy.linux).toEqual(linuxBefore);
  });

  it('turning Linux off only changes the linux.ai_data_collection block', async () => {
    policy.linux.ai_data_collection = { enabled: true };
    const windowsBefore = cloneDeep(policy.windows);
    const macBefore = cloneDeep(policy.mac);
    render();

    await userEvent.click(renderResult.getByTestId(testSubj.linux.enableDisableSwitch));

    const updatedPolicy = getUpdatedPolicy();
    expect(updatedPolicy.linux.ai_data_collection).toEqual({ enabled: false });
    expect(updatedPolicy.windows).toEqual(windowsBefore);
    expect(updatedPolicy.mac).toEqual(macBefore);
  });

  describe('and displayed in view mode', () => {
    beforeEach(() => {
      props.mode = 'view';
    });

    it('disables every OS switch', () => {
      render();

      expectIsViewOnly(renderResult.getByTestId(testSubj.card));
    });

    it('still shows every OS switch, turned off, when AI Data Collection is off on every OS', () => {
      for (const os of OS_KEYS) {
        policy[PolicyOperatingSystem[os]].ai_data_collection = { enabled: false };
      }
      render();

      for (const os of OS_KEYS) {
        expect(renderResult.getByTestId(testSubj[os].enableDisableSwitch)).toHaveAttribute(
          'aria-checked',
          'false'
        );
      }
    });
  });
});
