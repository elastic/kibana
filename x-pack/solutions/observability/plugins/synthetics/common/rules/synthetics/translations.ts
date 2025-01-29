/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SyntheticsMonitorStatusTranslations = {
  defaultActionMessage: i18n.translate(
    'xpack.synthetics.alerts.syntheticsMonitorStatus.defaultActionMessage',
    {
      // the extra spaces before `\n` are needed to properly convert this from markdown to an HTML email
      defaultMessage: `Monitor "{monitorName}" is {status} from {locationNames}.{pendingLastRunAt} - Elastic Synthetics\n\nDetails:\n\n- Monitor name: {monitorName}  \n- {monitorUrlLabel}: {monitorUrl}  \n- Monitor type: {monitorType}  \n- Checked at: {checkedAt}  \n- From: {locationNames}  \n- Reason: {reason} \n- Error received: {lastErrorMessage}  \n{linkMessage}`,
      values: {
        monitorName: '{{context.monitorName}}',
        monitorType: '{{context.monitorType}}',
        monitorUrl: '{{{context.monitorUrl}}}',
        monitorUrlLabel: '{{context.monitorUrlLabel}}',
        status: '{{{context.status}}}',
        lastErrorMessage: '{{{context.lastErrorMessage}}}',
        locationNames: '{{context.locationNames}}',
        checkedAt: '{{context.checkedAt}}',
        linkMessage: '{{{context.linkMessage}}}',
        pendingLastRunAt: '{{{context.pendingLastRunAt}}}',
        reason: '{{{context.reason}}}',
      },
    }
  ),
  defaultSubjectMessage: i18n.translate(
    'xpack.synthetics.alerts.syntheticsMonitorStatus.defaultSubjectMessage',
    {
      defaultMessage: 'Monitor "{monitorName}" ({locationNames}) is down - Elastic Synthetics',
      values: {
        monitorName: '{{context.monitorName}}',
        locationNames: '{{context.locationNames}}',
      },
    }
  ),
  defaultRecoverySubjectMessage: i18n.translate(
    'xpack.synthetics.alerts.syntheticsMonitorStatus.defaultRecoverySubjectMessage',
    {
      defaultMessage:
        'Monitor "{monitorName}" ({locationNames}) {recoveryStatus} - Elastic Synthetics',
      values: {
        recoveryStatus: '{{context.recoveryStatus}}',
        locationNames: '{{context.locationNames}}',
        monitorName: '{{context.monitorName}}',
      },
    }
  ),
  defaultRecoveryMessage: i18n.translate(
    'xpack.synthetics.alerts.syntheticsMonitorStatus.defaultRecoveryMessage',
    {
      // the extra spaces before `\n` are needed to properly convert this from markdown to an HTML email
      defaultMessage:
        'The alert for monitor "{monitorName}" from {locationNames} is no longer active: {recoveryReason}. - Elastic Synthetics\n\nDetails:\n\n- Monitor name: {monitorName}  \n- {monitorUrlLabel}: {monitorUrl}  \n- Monitor type: {monitorType}  \n- From: {locationNames}  \n- Last error received: {lastErrorMessage}  \n{linkMessage}',
      values: {
        monitorName: '{{context.monitorName}}',
        monitorUrlLabel: '{{context.monitorUrlLabel}}',
        monitorUrl: '{{{context.monitorUrl}}}',
        monitorType: '{{context.monitorType}}',
        locationNames: '{{context.locationNames}}',
        recoveryReason: '{{context.recoveryReason}}',
        lastErrorMessage: '{{{context.lastErrorMessage}}}',
        linkMessage: '{{{context.linkMessage}}}',
      },
    }
  ),
  name: i18n.translate('xpack.synthetics.alerts.syntheticsMonitorStatus.clientName', {
    defaultMessage: 'Monitor status',
  }),
  description: i18n.translate('xpack.synthetics.alerts.syntheticsMonitorStatus.description', {
    defaultMessage: 'Alert when a monitor is down.',
  }),
};

export const TlsTranslations = {
  defaultActionMessage: i18n.translate('xpack.synthetics.rules.tls.defaultActionMessage', {
    defaultMessage: `TLS certificate {commonName} {status} - Elastic Synthetics\n\nDetails:\n\n- Summary: {summary}\n- Common name: {commonName}\n- Issuer: {issuer}\n- Monitor: {monitorName}  \n- Monitor URL: {monitorUrl}  \n- Monitor type: {monitorType}  \n- From: {locationNames}`,
    values: {
      commonName: '{{context.commonName}}',
      issuer: '{{context.issuer}}',
      summary: '{{context.summary}}',
      status: '{{context.status}}',
      monitorName: '{{context.monitorName}}',
      monitorUrl: '{{{context.monitorUrl}}}',
      monitorType: '{{context.monitorType}}',
      locationNames: '{{context.locationNames}}',
    },
  }),
  defaultRecoveryMessage: i18n.translate('xpack.synthetics.rules.tls.defaultRecoveryMessage', {
    defaultMessage: `TLS alert for monitor "{monitorName}" has recovered - Elastic Synthetics\n\nDetails:\n\n- Summary: {summary}\n- New status : {newStatus}\n- Previous status: {previousStatus}\n- Monitor: {monitorName}  \n- URL: {monitorUrl}  \n- Monitor type: {monitorType}  \n- From: {locationNames}`,
    values: {
      summary: '{{context.summary}}',
      previousStatus: '{{context.previousStatus}}',
      newStatus: '{{context.newStatus}}',
      monitorName: '{{context.monitorName}}',
      monitorUrl: '{{{context.monitorUrl}}}',
      monitorType: '{{context.monitorType}}',
      locationNames: '{{context.locationNames}}',
    },
  }),
  name: i18n.translate('xpack.synthetics.rules.tls.clientName', {
    defaultMessage: 'Synthetics TLS',
  }),
  description: i18n.translate('xpack.synthetics.rules.tls.description', {
    defaultMessage: 'Alert when the TLS certificate of a Synthetics monitor is about to expire.',
  }),
  defaultSubjectMessage: i18n.translate(
    'xpack.synthetics.alerts.syntheticsMonitorTLS.defaultSubjectMessage',
    {
      defaultMessage: 'Alert triggered for certificate {commonName} - Elastic Synthetics',
      values: {
        commonName: '{{context.commonName}}',
      },
    }
  ),
  defaultRecoverySubjectMessage: i18n.translate(
    'xpack.synthetics.alerts.syntheticsMonitorTLS.defaultRecoverySubjectMessage',
    {
      defaultMessage: 'Alert has resolved for certificate {commonName} - Elastic Synthetics',
      values: {
        commonName: '{{context.commonName}}',
      },
    }
  ),
};
