/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { SwitchSchemaMessage } from './switch_schema_message';

const mockReportSchemaSelectorInteraction = jest.fn();

jest.mock('../../hooks/use_kibana', () => ({
  useKibanaContextForPlugin: () => ({
    services: {
      telemetry: {
        reportSchemaSelectorInteraction: mockReportSchemaSelectorInteraction,
      },
    },
  }),
}));

const DATA_TEST_SUBJ = 'infraInventoryViewNoDataInSelectedSchema';

const renderMessage = (props: Partial<React.ComponentProps<typeof SwitchSchemaMessage>> = {}) => {
  const onSwitchSchema = props.onSwitchSchema ?? jest.fn();
  render(
    <EuiProvider>
      <I18nProvider>
        <SwitchSchemaMessage
          dataTestSubj={props.dataTestSubj ?? DATA_TEST_SUBJ}
          nodeType={props.nodeType ?? 'host'}
          targetSchema={props.targetSchema ?? 'ecs'}
          onSwitchSchema={onSwitchSchema}
        />
      </I18nProvider>
    </EuiProvider>
  );
  return { onSwitchSchema };
};

describe('SwitchSchemaMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('switches to the target schema when the call to action is clicked', async () => {
    const { onSwitchSchema } = renderMessage({ targetSchema: 'ecs' });

    await userEvent.click(screen.getByTestId(DATA_TEST_SUBJ));

    expect(onSwitchSchema).toHaveBeenCalledWith('ecs');
    expect(mockReportSchemaSelectorInteraction).toHaveBeenCalledWith({
      interaction: 'switch schema from empty state',
      schema_selected: 'ecs',
      schemas_available: ['ecs'],
    });
  });

  it('renders the call to action as an in-app action rather than a link to documentation', () => {
    renderMessage();

    const callToAction = screen.getByTestId(DATA_TEST_SUBJ);
    expect(callToAction).not.toHaveAttribute('href');
    expect(callToAction).not.toHaveAttribute('target');
  });

  it('renders an external learn more link for hosts', () => {
    renderMessage({ nodeType: 'host' });

    const learnMore = screen.getByTestId(`${DATA_TEST_SUBJ}LearnMore`);
    expect(learnMore).toHaveAttribute('href', 'https://ela.st/docs-otel-schema-selector-hosts');
    expect(learnMore).toHaveAttribute('target', '_blank');
  });

  it('does not render a learn more link for pods, which have no schema documentation yet', () => {
    renderMessage({ nodeType: 'pod' });

    expect(screen.queryByTestId(`${DATA_TEST_SUBJ}LearnMore`)).not.toBeInTheDocument();
  });
});
