/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import {
  entityStoreIdType,
  impactEntityFlyoutType,
  type ImpactEntityTarget,
} from '@kbn/agentic-investigations-common';
import type { FlyoutDescriptor } from '../../flyout_v2/shared/url_state/flyout_v2_url_param';
import type { SecurityCanvasEmbeddedBundle } from '../components/security_redux_embedded_provider';
import { GroupedAttachmentFlyoutOpener } from './grouped_attachments/flyout_opener';

const OPENER_CONTAINER_TEST_SUBJ = 'securityImpactEntityFlyoutOpener';

/** The entity's main flyout, by Entity Store id when it has one, otherwise by name. */
const toDescriptor = (entity: ImpactEntityTarget): FlyoutDescriptor | undefined => {
  const flyoutType = impactEntityFlyoutType(entity);
  if (!flyoutType) {
    return undefined;
  }
  const name = entity.name ?? entity.id;
  const entityId = entityStoreIdType(entity.id) ? entity.id : undefined;
  switch (flyoutType) {
    case 'host':
      return { kind: 'host', hostName: name, entityId };
    case 'user':
      return { kind: 'user', userName: name, entityId };
    case 'service':
      return { kind: 'service', serviceName: name, entityId };
  }
};

let unmountOpener: (() => void) | undefined;

/**
 * The opener is a component that opens the flyout on mount, as the "What's happened" rows do.
 * Those rows own their opener; the impact row lives in another plugin and reaches us through a
 * plain callback, so the opener mounts in a hidden node on the body instead. It stays mounted
 * the way a row's does, and the next open replaces it.
 */
const mountOpener = (node: React.ReactElement, rendering: CoreStart['rendering']): void => {
  unmountOpener?.();
  let container = document.querySelector<HTMLElement>(
    `[data-test-subj="${OPENER_CONTAINER_TEST_SUBJ}"]`
  );
  if (!container) {
    container = document.createElement('div');
    container.dataset.testSubj = OPENER_CONTAINER_TEST_SUBJ;
    container.style.display = 'none';
    document.body.appendChild(container);
  }
  unmountOpener = toMountPoint(node, rendering)(container);
};

/**
 * Opens the entity's main flyout the way the "What's happened" rows open theirs: pushed onto the
 * investigation flyout's history, so Back returns to the investigation. An Entity Store id
 * resolves the record directly; an entity recorded by name resolves through its type.
 */
export const openImpactEntityFlyout = ({
  entity,
  rendering,
  resolveSecurityCanvasContext,
}: {
  entity: ImpactEntityTarget;
  rendering: CoreStart['rendering'];
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}): void => {
  const descriptor = toDescriptor(entity);
  if (!descriptor) {
    return;
  }

  mountOpener(
    <GroupedAttachmentFlyoutOpener
      key={`${descriptor.kind}:${entity.id}:${Date.now()}`}
      descriptor={descriptor}
      resolveSecurityCanvasContext={resolveSecurityCanvasContext}
    />,
    rendering
  );
};
