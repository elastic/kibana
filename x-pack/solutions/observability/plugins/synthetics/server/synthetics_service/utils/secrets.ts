/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { omit, pick } from 'lodash';
import type { SavedObject } from '@kbn/core/server';
import type { SyntheticsMonitor880 } from '../../saved_objects/migrations/monitors/8.8.0';
import { secretKeys } from '../../../common/constants/monitor_management';
import type {
  SyntheticsMonitor,
  SyntheticsMonitorWithSecretsAttributes,
} from '../../../common/runtime_types/monitor_management';
import { ConfigKey } from '../../../common/runtime_types/monitor_management';
import { DEFAULT_FIELDS } from '../../../common/constants/monitor_defaults';

const secretKeySet = new Set<string>(secretKeys);

export function formatSecrets(monitor: SyntheticsMonitor): SyntheticsMonitorWithSecretsAttributes {
  const monitorWithoutSecrets = omit(monitor, secretKeys) as SyntheticsMonitorWithSecretsAttributes;
  const secrets = pick(monitor, secretKeys);

  return {
    ...monitorWithoutSecrets,
    secrets: JSON.stringify(secrets),
  };
}

/**
 * Guards the saved object write paths. `secrets` is the only encrypted attribute on the monitor
 * types, so a secret left at the top level of the attributes would be persisted in the clear, and
 * a document with no payload at all would drop the monitor's secrets — the write paths replace
 * attributes rather than merging them. Callers must pass the monitor through {@link formatSecrets}.
 */
export function assertSecretsEncapsulated(attributes: object, monitorId: string): void {
  // Key names only, never the values.
  const strayKeys = Object.keys(attributes).filter((key) => secretKeySet.has(key));
  if (strayKeys.length > 0) {
    throw new Error(
      `Monitor ${monitorId} carries plaintext secret attributes [${strayKeys.join(
        ', '
      )}]. Pass it through formatSecrets before writing it.`
    );
  }

  if (typeof (attributes as { secrets?: unknown }).secrets !== 'string') {
    throw new Error(
      `Monitor ${monitorId} has no 'secrets' payload. Pass it through formatSecrets before writing it.`
    );
  }
}

export function normalizeSecrets(
  monitor: SavedObject<SyntheticsMonitorWithSecretsAttributes | SyntheticsMonitor880>
): SavedObject<SyntheticsMonitor> {
  const attributes = normalizeMonitorSecretAttributes(monitor.attributes);
  return {
    ...monitor,
    attributes,
  };
}

export function normalizeMonitorSecretAttributes(
  monitor: SyntheticsMonitorWithSecretsAttributes | SyntheticsMonitor880
): SyntheticsMonitor {
  const defaultFields = DEFAULT_FIELDS[monitor[ConfigKey.MONITOR_TYPE]];
  const normalizedMonitorAttributes = {
    ...defaultFields,
    ...monitor,
    ...JSON.parse(monitor.secrets || '{}'),
  };
  delete normalizedMonitorAttributes.secrets;
  return normalizedMonitorAttributes;
}
