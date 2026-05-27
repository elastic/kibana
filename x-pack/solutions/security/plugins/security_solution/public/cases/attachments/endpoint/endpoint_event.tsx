/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import { useNavigation } from '@kbn/security-solution-navigation/src/navigation';
import React, { useCallback, useMemo } from 'react';
import type { UnifiedReferenceAttachmentViewProps } from '@kbn/cases-plugin/public/client/attachment_framework/types';

import { ISOLATED_HOST, RELEASED_HOST, OTHER_ENDPOINTS } from '../../pages/translations';
import type { EndpointMetadata, EndpointTarget } from './types';
import { getEndpointDetailsPath } from '../../../management/common/routing';

type Props = Pick<UnifiedReferenceAttachmentViewProps, 'metadata'>;

interface EndpointEventLinkProps {
  target: EndpointTarget;
  actionText: string;
  remainingTargets: number;
}

const EndpointEventLink = ({ target, actionText, remainingTargets }: EndpointEventLinkProps) => {
  const { getAppUrl, navigateTo } = useNavigation();

  const linkHref = useMemo(() => {
    if (target.agentType === 'endpoint') {
      return getAppUrl({
        path: getEndpointDetailsPath({
          name: 'endpointActivityLog',
          selected_endpoint: target.endpointId,
        }),
      });
    }
    return getAppUrl({
      path: `/hosts/name/${encodeURIComponent(target.hostname)}`,
    });
  }, [getAppUrl, target.agentType, target.endpointId, target.hostname]);

  const onLinkClick = useCallback(
    (ev: React.MouseEvent<HTMLAnchorElement>) => {
      ev.preventDefault();
      return navigateTo({ url: linkHref });
    },
    [navigateTo, linkHref]
  );

  return (
    <>
      {actionText}
      {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
      <EuiLink
        onClick={onLinkClick}
        href={linkHref}
        data-test-subj={`actions-link-${target.endpointId}`}
      >
        {target.hostname}
      </EuiLink>
      {remainingTargets > 0 && OTHER_ENDPOINTS(remainingTargets)}
    </>
  );
};

const AttachmentContentEvent = ({ metadata }: Props) => {
  const endpointMetadata = metadata as EndpointMetadata | undefined;
  const targets = endpointMetadata?.targets ?? [];
  const command = endpointMetadata?.command ?? '';

  if (!targets.length) {
    return null;
  }

  const actionText = command === 'isolate' ? `${ISOLATED_HOST} ` : `${RELEASED_HOST} `;

  return (
    <EndpointEventLink
      target={targets[0]}
      actionText={actionText}
      remainingTargets={targets.length - 1}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { AttachmentContentEvent as default };
