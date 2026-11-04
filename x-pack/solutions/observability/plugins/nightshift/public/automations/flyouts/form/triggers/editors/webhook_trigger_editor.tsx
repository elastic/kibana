/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonIcon,
  EuiCodeBlock,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { KbnWarningCallout } from '@kbn/ui-callout';
import type { TriggerFormValues } from '../../automation_form_values';
import { useKibana } from '../../../../../hooks/use_kibana';
import { useConnectedClusters } from '../../../../../sandbox_connectors/use_connected_clusters';
import { getInboundWebhookUrl } from '../../../../utils/webhook_url';
import { getWebhookExamplePayload } from '../../../../utils/webhook_example';
import { Sentence, SentenceIcon } from '../pills/sentence';
import { triggerLabels } from '../translations';

export const WebhookTriggerEditor = ({
  trigger,
  onChange,
  readOnly = false,
}: {
  trigger: Extract<TriggerFormValues, { kind: 'webhook' }>;
  onChange: (trigger: TriggerFormValues) => void;
  readOnly?: boolean;
}) => {
  const { http } = useKibana().services;
  const url = trigger.connectorId ? getInboundWebhookUrl(http, trigger.connectorId) : undefined;

  // The clusters an alert can be about: External Elasticsearch connectors the agent can use.
  const { clusters, known: clustersKnown, none: noClusters } = useConnectedClusters();
  const selectedCluster = clusters.find(({ id }) => id === trigger.clusterConnectorId);

  return (
    <>
      <Sentence>
        <SentenceIcon type="link" />
        <EuiText size="s" data-test-subj="automationWebhookSentence">
          {trigger.mode === 'alert'
            ? triggerLabels.remoteAlertSentence
            : triggerLabels.webhookRequestSentence}
        </EuiText>
      </Sentence>
      {trigger.mode === 'alert' && (
        <>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued" data-test-subj="automationWebhookAlertHelp">
            {triggerLabels.webhookAlertHelp}
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiCodeBlock language="json" fontSize="s" paddingSize="s" transparentBackground>
            {getWebhookExamplePayload('alert')}
          </EuiCodeBlock>
          <EuiSpacer size="s" />
          {noClusters && (
            <KbnWarningCallout
              announceOnMount
              size="s"
              title={triggerLabels.webhookClusterNone}
              data-test-subj="automationWebhookClusterNoneCallout"
            />
          )}
          {clustersKnown && clusters.length > 0 && (
            <EuiFormRow
              label={triggerLabels.webhookCluster}
              helpText={triggerLabels.webhookClusterHelp}
              fullWidth
            >
              {readOnly ? (
                <EuiText size="s" data-test-subj="automationWebhookClusterName">
                  {selectedCluster?.name ?? trigger.clusterConnectorId}
                </EuiText>
              ) : (
                <EuiSelect
                  fullWidth
                  aria-label={triggerLabels.webhookCluster}
                  data-test-subj="automationWebhookCluster"
                  value={selectedCluster?.id ?? ''}
                  options={[
                    { value: '', text: triggerLabels.webhookClusterPlaceholder, disabled: true },
                    ...clusters.map(({ id, name }) => ({ value: id, text: name })),
                  ]}
                  onChange={(event) =>
                    onChange({ ...trigger, clusterConnectorId: event.target.value || undefined })
                  }
                />
              )}
            </EuiFormRow>
          )}
          {clustersKnown && trigger.clusterConnectorId && !selectedCluster && (
            <>
              <EuiSpacer size="xs" />
              <KbnWarningCallout
                announceOnMount
                size="s"
                title={triggerLabels.webhookClusterMissing}
                data-test-subj="automationWebhookClusterMissing"
              />
            </>
          )}
        </>
      )}
      <EuiSpacer size="xs" />
      {url ? (
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {triggerLabels.webhookUrlLabel}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem css={{ minWidth: 0 }}>
            <EuiText
              size="xs"
              css={{ overflowWrap: 'anywhere' }}
              data-test-subj="automationWebhookUrl"
            >
              <code>{url}</code>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiCopy textToCopy={url}>
              {(copy) => (
                <EuiToolTip content={triggerLabels.webhookUrlLabel} disableScreenReaderOutput>
                  <EuiButtonIcon
                    data-test-subj="nightshiftWebhookTriggerEditorButton"
                    iconType="copy"
                    aria-label={triggerLabels.webhookUrlLabel}
                    onClick={copy}
                  />
                </EuiToolTip>
              )}
            </EuiCopy>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <EuiText size="xs" color="subdued">
          {triggerLabels.webhookUrlPending}
        </EuiText>
      )}
    </>
  );
};
