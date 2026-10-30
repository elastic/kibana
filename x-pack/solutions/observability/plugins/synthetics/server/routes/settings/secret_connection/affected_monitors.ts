/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isIP } from 'net';
import { isPlainObject, omit } from 'lodash';
import type { RouteContext } from '../../types';
import type { SyntheticsMonitor } from '../../../../common/runtime_types';
import type {
  AffectedMonitorReason,
  AffectedMonitorsResult,
} from '../../../../common/runtime_types';
import { ConfigKey, MonitorTypeEnum } from '../../../../common/runtime_types';
import { normalizeAllowedMonitorHost } from '../../../../common/lib/allowed_monitor_hosts';
import { getParamsForSpace } from '../../../synthetics_service/formatters/param_utils';
import { replaceStringWithParams } from '../../../synthetics_service/formatters/formatting_utils';
import { mixParamsWithGlobalParams } from '../../../synthetics_service/formatters/public_formatters/format_configs';
import { referencedConnectionNames } from '../../../synthetics_service/formatters/vault_param_formatter';
import { normalizeSecrets } from '../../../synthetics_service/utils';

// Heartbeat only lets http, tcp and icmp monitors use a connection with `allowed_hosts`.
const HOST_RESTRICTABLE_TYPES = new Set<string>([
  MonitorTypeEnum.HTTP,
  MonitorTypeEnum.TCP,
  MonitorTypeEnum.ICMP,
]);

const MAX_LISTED_AFFECTED_MONITORS = 20;

// IPs in their canonical form (as Heartbeat compares them), names lowercase without a trailing dot.
const canonicalHost = (host: string): string => {
  const normalized = normalizeAllowedMonitorHost(host);
  if (isIP(normalized) !== 6) return normalized;
  try {
    return new URL(`http://[${normalized}]`).hostname.replace(/^\[|\]$/g, '');
  } catch {
    return normalized;
  }
};

/** The host of a monitor target (`https://host/path`, `host:port` or `host`), if it has one. */
const hostOfTarget = (target: unknown): string | undefined => {
  if (typeof target !== 'string' || !target.trim()) return undefined;
  const value = target.trim();
  // A bare IPv6 literal (an ICMP host) has no port and is not a valid URL authority unbracketed.
  if (isIP(value) === 6) return canonicalHost(value);
  try {
    const { hostname } = new URL(value.includes('://') ? value : `tcp://${value}`);
    return hostname ? canonicalHost(hostname.replace(/^\[|\]$/g, '')) : undefined;
  } catch {
    return undefined;
  }
};

const asList = (value: unknown): unknown[] => (Array.isArray(value) ? value : [value]);

/**
 * Substitutes parameters in every string on its own, like the real formatters do per field. The
 * whole-object path serializes to JSON first, so a parameter holding a quote or a backslash
 * would break it and leave everything unresolved.
 */
const resolveParams = (value: unknown, params: Record<string, string>): unknown => {
  if (typeof value === 'string') return replaceStringWithParams(value, params);
  if (Array.isArray(value)) return value.map((item) => resolveParams(item, params));
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        resolveParams(item, params),
      ])
    );
  }
  return value;
};

/**
 * Why Heartbeat would refuse the monitor once the connection is restricted to `allowedHosts`, or
 * `undefined` when it can still use it. Mirrors Heartbeat's check: browser monitors and redirects
 * are refused, and every target and the proxy must be on the list.
 */
export const getAllowedHostsRefusal = (
  monitor: Record<string, unknown>,
  allowedHosts: ReadonlySet<string>
): AffectedMonitorReason | undefined => {
  const type = monitor[ConfigKey.MONITOR_TYPE];
  if (typeof type !== 'string' || !HOST_RESTRICTABLE_TYPES.has(type)) return 'monitor_type';
  if (type === MonitorTypeEnum.HTTP && Number(monitor[ConfigKey.MAX_REDIRECTS]) > 0) {
    return 'redirects';
  }

  const targets = [
    ...asList(type === MonitorTypeEnum.HTTP ? monitor[ConfigKey.URLS] : monitor[ConfigKey.HOSTS]),
    ...(monitor[ConfigKey.PROXY_URL] ? [monitor[ConfigKey.PROXY_URL]] : []),
  ];
  // A target that can't be read (empty or still holding an unresolved parameter) can't be shown
  // to be on the list.
  const isAllowed = (target: unknown) => {
    const host = hostOfTarget(target);
    return host !== undefined && allowedHosts.has(host);
  };
  return targets.every(isAllowed) ? undefined : 'host';
};

/** A connection and the hosts monitors using it would be limited to. */
export interface AllowedHostsCheck {
  name: string;
  allowedMonitorHosts: readonly string[];
}

// The check is advisory and the UI asks for it while an admin edits, so a large space must not
// leave a request hanging.
export const AFFECTED_MONITORS_TIMEOUT_MS = 8000;

/**
 * For each connection, the monitors of the space that use it, directly or through a parameter,
 * and would be refused by Heartbeat once it is limited to its allowed hosts. One pass over the
 * monitors answers for all of them. Rejects after {@link AFFECTED_MONITORS_TIMEOUT_MS}.
 */
export const findAffectedMonitors = (
  routeContext: Pick<
    RouteContext,
    'syntheticsMonitorClient' | 'monitorConfigRepository' | 'spaceId'
  >,
  checks: readonly AllowedHostsCheck[]
): Promise<Record<string, AffectedMonitorsResult>> => {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`timed out after ${AFFECTED_MONITORS_TIMEOUT_MS / 1000}s`)),
      AFFECTED_MONITORS_TIMEOUT_MS
    );
  });
  return Promise.race([scanAffectedMonitors(routeContext, checks), timeout]).finally(() =>
    clearTimeout(timer)
  );
};

const scanAffectedMonitors = async (
  {
    syntheticsMonitorClient,
    monitorConfigRepository,
    spaceId,
  }: Pick<RouteContext, 'syntheticsMonitorClient' | 'monitorConfigRepository' | 'spaceId'>,
  checks: readonly AllowedHostsCheck[]
): Promise<Record<string, AffectedMonitorsResult>> => {
  const [paramsBySpace, savedMonitors] = await Promise.all([
    syntheticsMonitorClient.getSyntheticsParams({ spaceId }),
    monitorConfigRepository.findDecryptedMonitors({ spaceId }),
  ]);
  const params = getParamsForSpace(paramsBySpace, spaceId);
  const allowedByConnection = new Map(
    checks.map(({ name, allowedMonitorHosts }) => [
      name,
      new Set(allowedMonitorHosts.map(canonicalHost)),
    ])
  );
  const affected = new Map<string, AffectedMonitorsResult['monitors']>(
    checks.map(({ name }) => [name, []])
  );
  const totals = new Map<string, number>(checks.map(({ name }) => [name, 0]));

  for (const savedMonitor of savedMonitors) {
    const attributes = normalizeSecrets(savedMonitor).attributes as unknown as Record<
      string,
      unknown
    >;
    // What Heartbeat sees: parameters substituted, and the script itself left out.
    const resolved = resolveParams(
      omit(attributes, [ConfigKey.SOURCE_INLINE, ConfigKey.SOURCE_PROJECT_CONTENT]),
      params
    ) as Record<string, unknown>;
    // A browser monitor reads parameters as `params.name`, not as `${name}` in a field, and gets
    // the global ones merged under its own: as deployed, so use the same merge.
    if (attributes[ConfigKey.MONITOR_TYPE] === MonitorTypeEnum.BROWSER) {
      resolved[ConfigKey.PARAMS] = mixParamsWithGlobalParams(
        params,
        attributes as unknown as SyntheticsMonitor
      ).params;
    }
    const used = referencedConnectionNames(resolved);
    for (const [name, allowed] of allowedByConnection) {
      if (!used.has(name)) continue;
      const reason = getAllowedHostsRefusal(resolved, allowed);
      if (!reason) continue;
      totals.set(name, (totals.get(name) ?? 0) + 1);
      const listed = affected.get(name) ?? [];
      if (listed.length < MAX_LISTED_AFFECTED_MONITORS) {
        listed.push({ name: String(attributes[ConfigKey.NAME]), reason });
      }
    }
  }
  return Object.fromEntries(
    checks.map(({ name }) => [
      name,
      { monitors: affected.get(name) ?? [], total: totals.get(name) ?? 0 },
    ])
  );
};
