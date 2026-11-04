/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { TriggerFormValues } from '../../automation_form_values';
import { WebhookTriggerEditor } from './webhook_trigger_editor';

const mockConnectedClusters = jest.fn();

jest.mock('../../../../../hooks/use_kibana', () => ({
  useKibana: () => ({ services: { http: { basePath: { prepend: (path: string) => path } } } }),
}));
jest.mock('../../../../../sandbox_connectors/use_connected_clusters', () => ({
  useConnectedClusters: () => mockConnectedClusters(),
}));

type WebhookTrigger = Extract<TriggerFormValues, { kind: 'webhook' }>;

const cluster = (id: string, name: string) => ({
  id,
  name,
  connector_type_id: '.elasticsearch',
  is_preconfigured: false,
});

const connected = (...clusters: Array<ReturnType<typeof cluster>>) =>
  mockConnectedClusters.mockReturnValue({ clusters, known: true, none: clusters.length === 0 });

const onChange = jest.fn();

const renderEditor = (trigger: WebhookTrigger, readOnly = false) =>
  render(
    <I18nProvider>
      <WebhookTriggerEditor trigger={trigger} onChange={onChange} readOnly={readOnly} />
    </I18nProvider>
  );

const remoteAlert: WebhookTrigger = { kind: 'webhook', mode: 'alert' };
const savedRequestWebhook: WebhookTrigger = { kind: 'webhook', mode: 'generic' };

describe('WebhookTriggerEditor', () => {
  beforeEach(() => {
    onChange.mockClear();
    connected(cluster('es-a', 'Cluster A'), cluster('es-b', 'Cluster B'));
  });

  describe('as a remote Elastic alert', () => {
    it('describes the trigger, with no payload type to choose', () => {
      renderEditor(remoteAlert);
      expect(screen.getByTestId('automationWebhookSentence')).toHaveTextContent(
        'When a remote Elastic alert is posted to this automation’s webhook URL'
      );
      expect(screen.queryByTestId('automationWebhookMode')).not.toBeInTheDocument();
    });

    it('offers the connected clusters', () => {
      renderEditor(remoteAlert);
      const options = within(screen.getByTestId('automationWebhookCluster'))
        .getAllByRole('option')
        .map((option) => option.textContent);
      expect(options).toEqual(['Select a connected cluster', 'Cluster A', 'Cluster B']);
    });

    it('records the chosen connector id on the trigger', () => {
      renderEditor(remoteAlert);
      fireEvent.change(screen.getByTestId('automationWebhookCluster'), {
        target: { value: 'es-b' },
      });
      expect(onChange).toHaveBeenCalledWith({ ...remoteAlert, clusterConnectorId: 'es-b' });
    });

    it('shows the saved choice as selected', () => {
      renderEditor({ ...remoteAlert, clusterConnectorId: 'es-a' });
      expect(screen.getByTestId('automationWebhookCluster')).toHaveValue('es-a');
      expect(screen.queryByTestId('automationWebhookClusterMissing')).not.toBeInTheDocument();
    });

    it('warns when the saved connector is no longer connected, and keeps it until changed', () => {
      renderEditor({ ...remoteAlert, clusterConnectorId: 'gone' });
      expect(screen.getByTestId('automationWebhookClusterMissing')).toBeInTheDocument();
      expect(screen.getByTestId('automationWebhookCluster')).toHaveValue('');
      expect(onChange).not.toHaveBeenCalled();
    });

    it('shows the cluster name, not a select, when read only', () => {
      renderEditor({ ...remoteAlert, clusterConnectorId: 'es-a' }, true);
      expect(screen.getByTestId('automationWebhookClusterName')).toHaveTextContent('Cluster A');
      expect(screen.queryByTestId('automationWebhookCluster')).not.toBeInTheDocument();
    });

    it('explains that a cluster is needed when none is connected', () => {
      connected();
      renderEditor({ ...remoteAlert, clusterConnectorId: 'es-a' });
      expect(screen.getByTestId('automationWebhookClusterNoneCallout')).toBeInTheDocument();
      expect(screen.queryByTestId('automationWebhookCluster')).not.toBeInTheDocument();
    });

    it('shows no cluster choice, and no warning, while the clusters are not known', () => {
      mockConnectedClusters.mockReturnValue({ clusters: [], known: false, none: false });
      renderEditor({ ...remoteAlert, clusterConnectorId: 'es-a' });
      expect(screen.queryByTestId('automationWebhookCluster')).not.toBeInTheDocument();
      expect(screen.queryByTestId('automationWebhookClusterNoneCallout')).not.toBeInTheDocument();
      expect(screen.queryByTestId('automationWebhookClusterMissing')).not.toBeInTheDocument();
    });
  });

  describe('as a request webhook saved earlier', () => {
    it('keeps describing it as a request, with no cluster choice', () => {
      renderEditor(savedRequestWebhook);
      expect(screen.getByTestId('automationWebhookSentence')).toHaveTextContent(
        'When a request is posted to this automation’s webhook URL'
      );
      expect(screen.queryByTestId('automationWebhookCluster')).not.toBeInTheDocument();
    });
  });
});
