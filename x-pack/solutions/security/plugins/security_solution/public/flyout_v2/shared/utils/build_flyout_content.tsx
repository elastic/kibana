/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getEcsField } from '../components/table_field_name_cell';
import {
  HOST_NAME_FIELD_NAME,
  IP_FIELD_TYPE,
  LEGACY_SIGNAL_RULE_NAME_FIELD_NAME,
  SIGNAL_RULE_NAME_FIELD_NAME,
  USER_NAME_FIELD_NAME,
} from '../../../timelines/components/timeline/body/renderers/constants';
import { FlowTargetSourceDest } from '../../../../common/search_strategy/security_solution/network';
import type { FlyoutType } from '../../../common/lib/telemetry';
import { FlyoutLoading } from '../components/flyout_loading';
import {
  formatFlyoutTitle,
  HOST_TITLE,
  NETWORK_TITLE,
  RULE_TITLE,
  USER_TITLE,
} from '../constants/flyout_titles';
import { FLYOUT_DESCRIPTOR_KIND } from '../url_state/flyout_v2_url_param';
import type { FlyoutDescriptor } from '../url_state/flyout_v2_url_param';

const Host = lazy(() => import('../../entity/host/main').then((m) => ({ default: m.Host })));
const Network = lazy(() => import('../../network/main').then((m) => ({ default: m.Network })));
const RuleDetails = lazy(() => import('../../rule/main').then((m) => ({ default: m.RuleDetails })));
const User = lazy(() => import('../../entity/user/main').then((m) => ({ default: m.User })));

const SuspenseFallback = <FlyoutLoading />;

/**
 * Describes how a supported field maps to a flyout: which `FlyoutType` it opens, the canonical title
 * to use for it, and how to render its content. Centralizing this in a single map (instead of
 * repeating parallel `if` chains in each exported helper) keeps the type, title, and content in sync.
 */
interface FlyoutFieldDescriptor {
  flyoutType: FlyoutType;
  title: string;
  render: (value: string, hit?: DataTableRecord) => React.ReactElement;
}

/**
 * Field-name → descriptor map for the fields whose flyout is selected purely by name. IP fields are
 * handled separately in {@link getFieldDescriptor} because they are matched by ECS field *type*
 * rather than by a fixed field name.
 */
const FIELD_FLYOUT_DESCRIPTORS: Record<string, FlyoutFieldDescriptor> = {
  [SIGNAL_RULE_NAME_FIELD_NAME]: {
    flyoutType: 'rule',
    title: RULE_TITLE,
    render: (value) => <RuleDetails ruleId={value} />,
  },
  [LEGACY_SIGNAL_RULE_NAME_FIELD_NAME]: {
    flyoutType: 'rule',
    title: RULE_TITLE,
    render: (value) => <RuleDetails ruleId={value} />,
  },
  [HOST_NAME_FIELD_NAME]: {
    flyoutType: 'host',
    title: HOST_TITLE,
    render: (value, hit) => <Host hostName={value} hit={hit} />,
  },
  [USER_NAME_FIELD_NAME]: {
    flyoutType: 'user',
    title: USER_TITLE,
    render: (value, hit) => <User userName={value} hit={hit} />,
  },
};

/**
 * Resolves the {@link FlyoutFieldDescriptor} for a field, or `undefined` if the field is not
 * supported. IP fields are matched by ECS type (and pick their flow target from the field name);
 * all other supported fields come from {@link FIELD_FLYOUT_DESCRIPTORS}.
 */
const getFieldDescriptor = (field: string): FlyoutFieldDescriptor | undefined => {
  const ecsField = getEcsField(field);

  if (ecsField?.type === IP_FIELD_TYPE) {
    const flowTarget = field.includes(FlowTargetSourceDest.destination)
      ? FlowTargetSourceDest.destination
      : FlowTargetSourceDest.source;

    return {
      flyoutType: 'network',
      title: NETWORK_TITLE,
      render: (value) => <Network ip={value} flowTarget={flowTarget} />,
    };
  }

  return FIELD_FLYOUT_DESCRIPTORS[field];
};

/**
 * Returns the React element to render inside the system flyout for the given field/value,
 * or null if the field type is not supported.
 *
 * Currently supports:
 * - IP fields → Network details flyout (value = IP address)
 * - Rule name field → Rule details flyout (value = rule ID)
 * - Host name → Host details flyout (pass hit for entity resolution)
 * - User name → User details flyout (pass hit for entity resolution)
 */
export const buildFlyoutContent = (
  field: string,
  value: string,
  hit?: DataTableRecord
): React.ReactElement | null => {
  const descriptor = getFieldDescriptor(field);
  if (!descriptor) {
    return null;
  }

  return <Suspense fallback={SuspenseFallback}>{descriptor.render(value, hit)}</Suspense>;
};

/**
 * Returns the `FlyoutType` that `buildFlyoutContent` would open for the given field, or
 * `undefined` if the field is not supported. Kept in sync with `buildFlyoutContent`'s branching so
 * callers can tag open/close telemetry without threading a discriminant through the built content.
 */
export const getFlyoutTypeForField = (field: string): FlyoutType | undefined =>
  getFieldDescriptor(field)?.flyoutType;

/**
 * Returns the serializable {@link FlyoutDescriptor} for the given field/value pair, or null when
 * the field is not supported. Mirrors the field detection in {@link buildFlyoutContent} so callers
 * can capture a URL descriptor alongside the React content they open.
 *
 * Supported fields: IP → network, signal rule name → rule, host.name → host, user.name → user.
 */
export const buildFlyoutDescriptorFromField = (
  field: string,
  value: string
): FlyoutDescriptor | null => {
  const ecsField = getEcsField(field);

  if (ecsField?.type === IP_FIELD_TYPE) {
    const flowTarget = field.includes(FlowTargetSourceDest.destination)
      ? FlowTargetSourceDest.destination
      : FlowTargetSourceDest.source;
    return { kind: FLYOUT_DESCRIPTOR_KIND.network, ip: value, flowTarget: flowTarget as string };
  }

  if (field === SIGNAL_RULE_NAME_FIELD_NAME || field === LEGACY_SIGNAL_RULE_NAME_FIELD_NAME) {
    return { kind: FLYOUT_DESCRIPTOR_KIND.rule, ruleId: value };
  }

  if (field === HOST_NAME_FIELD_NAME) {
    return { kind: FLYOUT_DESCRIPTOR_KIND.host, hostName: value };
  }

  if (field === USER_NAME_FIELD_NAME) {
    return { kind: FLYOUT_DESCRIPTOR_KIND.user, userName: value };
  }

  return null;
};

/**
 * Returns the flyout-history title for the given field/value pair, in the format
 * `"{canonical type}: {value}"` (e.g. `"Network: 10.0.0.1"`, `"Rule: My Rule"`). Mirrors the field
 * detection in {@link buildFlyoutContent} so callers can pass a consistent `title` to
 * `overlays.openSystemFlyout` alongside the content it returns. Returns `null` for unsupported
 * fields (mirroring `buildFlyoutContent`'s `null` return for the same case).
 */
export const buildFlyoutTitleFromField = (field: string, value: string): string | null => {
  const descriptor = getFieldDescriptor(field);
  return descriptor ? formatFlyoutTitle(descriptor.title, value) : null;
};
