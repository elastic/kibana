/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentProps } from 'react';
import React from 'react';
import { useKibana } from '../../../../../common/lib/kibana';
import { useSpaceId } from '../../../../../common/hooks/use_space_id';
import { fireEvent, render, screen, act } from '@testing-library/react';
import { DATA_TEST_SUBJ_PREFIX, StartRuleMigrationModal } from './start_rule_migration_modal';
import type { AIConnector } from '@kbn/elastic-assistant';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { useAIConnectors } from '../../../../../common/hooks/use_ai_connectors';

jest.mock('../../../../../common/lib/kibana');
const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

jest.mock('../../../../../common/hooks/use_space_id');
const useSpaceIdMock = useSpaceId as jest.MockedFunction<typeof useSpaceId>;

jest.mock('../../../../../common/components/links/link_props');

const startMigrationWithSettingsMock = jest.fn().mockResolvedValue(undefined);
const onCloseMock = jest.fn();
const availableConnectorsMock: AIConnector[] = [
  {
    id: 'connector-1',
    actionTypeId: '.bedrock',
    name: 'Connector 1',
    isPreconfigured: false,
    isSystemAction: false,
  },
  {
    id: 'connector-2',
    actionTypeId: 'gemini',
    name: 'Connector 2',
    isPreconfigured: true,
    isSystemAction: false,
  },
] as unknown as AIConnector[];

jest.mock('../../../../../common/hooks/use_ai_connectors');
const useAIConnectorsMock = useAIConnectors as jest.MockedFunction<typeof useAIConnectors>;

const renderTestComponent = (
  props: Partial<ComponentProps<typeof StartRuleMigrationModal>> = {}
) => {
  const finalProps = {
    onStartMigrationWithSettings: startMigrationWithSettingsMock,
    onClose: onCloseMock,
    defaultSettings: {
      connectorId: 'connector-1',
    },
    numberOfRules: 10,
    ...props,
  };

  return render(
    <IntlProvider locale="en">
      <StartRuleMigrationModal {...finalProps} />
    </IntlProvider>
  );
};
const siemMigrationsServiceMock = {
  rules: {
    connectorIdStorage: {
      get: jest.fn(),
    },
  },
};

describe('StartMigrationModal', () => {
  beforeEach(() => {
    useAIConnectorsMock.mockReturnValue({
      aiConnectors: availableConnectorsMock,
      isLoading: false,
    } as unknown as ReturnType<typeof useAIConnectors>);
    siemMigrationsServiceMock.rules.connectorIdStorage.get.mockReturnValue('connector-2');

    useKibanaMock.mockReturnValue({
      services: {
        triggersActionsUi: {
          actionTypeRegistry: {
            get: jest.fn().mockReturnValue('Mock Action Type'),
          },
        },
        siemMigrations: siemMigrationsServiceMock,
      },
    } as unknown as ReturnType<typeof useKibana>);

    useSpaceIdMock.mockReturnValue('default');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render successfully', () => {
    renderTestComponent();

    expect(screen.getByTestId(DATA_TEST_SUBJ_PREFIX)).toBeVisible();
    expect(screen.getByTestId(`${DATA_TEST_SUBJ_PREFIX}-Title`)).toHaveTextContent(
      `Reprocess 10 rules`
    );
    expect(screen.getByTestId(`connector-selector`)).toBeVisible();
    expect(screen.getByTestId(`connector-selector`)).toHaveTextContent('Connector 1');

    expect(
      screen.getByTestId(`${DATA_TEST_SUBJ_PREFIX}-PrebuiltRulesMatchingSwitch`)
    ).toBeChecked();
  });

  it('should list all available connectors', () => {
    renderTestComponent();
    const connectorSelector = screen.getByTestId(`connector-selector`);

    fireEvent.click(connectorSelector);
    const connectorOptions = screen.queryAllByTestId(/^connector-option-/);

    expect(connectorOptions).toHaveLength(availableConnectorsMock.length);
    expect(connectorOptions[0].textContent).toBe('Connector 1');
    expect(connectorOptions[1].textContent).toBe('Connector 2Preconfigured');
  });

  it('should render correct value of prebuilt rule match option', async () => {
    renderTestComponent({
      defaultSettings: {
        skipPrebuiltRulesMatching: true,
      },
    });

    const prebuiltRuleMatchCheckbox = screen.getByTestId(
      `${DATA_TEST_SUBJ_PREFIX}-PrebuiltRulesMatchingSwitch`
    );

    expect(prebuiltRuleMatchCheckbox).not.toBeChecked();
  });

  it('should trigger Migration with correct settings on confirm', () => {
    renderTestComponent();

    const confirmButton = screen.getByTestId(`${DATA_TEST_SUBJ_PREFIX}-Translate`);
    fireEvent.click(confirmButton);

    expect(startMigrationWithSettingsMock).toHaveBeenCalledWith({
      connectorId: 'connector-1',
      skipPrebuiltRulesMatching: false,
    });

    expect(onCloseMock).toHaveBeenCalled();
  });

  it('should trigger migration with changed settings when options are changed', async () => {
    renderTestComponent();
    // change connector and start
    const connectorSelector = screen.getByTestId(`connector-selector`);
    fireEvent.click(connectorSelector);

    const connectorOptions = screen.queryAllByTestId(/^connector-option-/);
    expect(connectorOptions).toHaveLength(availableConnectorsMock.length);

    fireEvent.click(connectorOptions[1]); // Select 'Connector 2'
    expect(screen.getByTestId(`connector-selector`)).toHaveTextContent('Connector 2');

    // skip prebuilt rules matching
    const prebuiltRuleMatchCheckbox = screen.getByTestId(
      `${DATA_TEST_SUBJ_PREFIX}-PrebuiltRulesMatchingSwitch`
    );
    fireEvent.click(prebuiltRuleMatchCheckbox);

    const confirmButton = screen.getByTestId(`${DATA_TEST_SUBJ_PREFIX}-Translate`);
    act(() => {
      fireEvent.click(confirmButton);
    });
    expect(startMigrationWithSettingsMock).toHaveBeenCalledWith({
      connectorId: 'connector-2',
      skipPrebuiltRulesMatching: true,
    });

    expect(onCloseMock).toHaveBeenCalled();
  });

  it('should show the first connector if no lastConnectorId and no stored connector', () => {
    siemMigrationsServiceMock.rules.connectorIdStorage.get.mockReturnValue(undefined);

    renderTestComponent({
      defaultSettings: {
        connectorId: undefined,
      },
    });

    expect(screen.getByTestId(`connector-selector`)).toHaveTextContent('Connector 1');
  });

  it('should show the stored connector if no lastConnectorId is provided', () => {
    renderTestComponent({
      defaultSettings: {
        connectorId: undefined,
      },
    });

    expect(screen.getByTestId(`connector-selector`)).toHaveTextContent('Connector 2');
  });
});
