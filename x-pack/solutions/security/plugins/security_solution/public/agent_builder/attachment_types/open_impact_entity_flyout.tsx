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

/** The name the flyout queries by: `name`, or the id with any Entity Store `type:` prefix cut. */
const entityName = (entity: ImpactEntityTarget): string =>
  entity.name ?? (entityStoreIdType(entity.id) ? entity.id.replace(/^[^:]+:/, '') : entity.id);

/** The entity's main flyout, by Entity Store id when it has one, otherwise by name. */
const toDescriptor = (entity: ImpactEntityTarget): FlyoutDescriptor | undefined => {
  const flyoutType = impactEntityFlyoutType(entity);
  if (!flyoutType) {
    return undefined;
  }
  const name = entityName(entity);
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

const unmount = (): void => {
  unmountOpener?.();
  unmountOpener = undefined;
};

/**
 * The opener opens the flyout on mount, as the "What's happened" rows do. Those rows own their
 * opener; the impact row lives in another plugin and reaches us through a plain callback, so
 * the opener mounts in a hidden node on the body. The flyout itself lives in a core overlay
 * with its own providers, so the opener is torn down as soon as it has fired.
 */
const mountOpener = (
  render: (onOpened: () => void) => React.ReactElement,
  rendering: CoreStart['rendering']
): void => {
  unmount();
  let container = document.querySelector<HTMLElement>(
    `[data-test-subj="${OPENER_CONTAINER_TEST_SUBJ}"]`
  );
  if (!container) {
    container = document.createElement('div');
    container.dataset.testSubj = OPENER_CONTAINER_TEST_SUBJ;
    container.style.display = 'none';
    document.body.appendChild(container);
  }
  // Deferred: `onOpened` fires inside the opener's own effect, and a root must not unmount
  // from within its own commit.
  const onOpened = () => setTimeout(unmount, 0);
  unmountOpener = toMountPoint(render(onOpened), rendering)(container);
};

/** Pushes the entity's flyout onto the investigation flyout, the way the "What's happened" rows do. */
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
    (onOpened) => (
      <GroupedAttachmentFlyoutOpener
        descriptor={descriptor}
        resolveSecurityCanvasContext={resolveSecurityCanvasContext}
        onOpened={onOpened}
      />
    ),
    rendering
  );
};
