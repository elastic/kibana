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
import { getEndpointDetailsPath } from '../../../management/common/routing';
import type { ResponseActionAgentType } from '../../../../common/endpoint/service/response_actions/constants';

interface EndpointTarget {
  endpointId: string;
  hostname: string;
  agentType: ResponseActionAgentType;
}

const UnifiedAttachmentEvent = ({ metadata }: UnifiedReferenceAttachmentViewProps) => {
  const { getAppUrl, navigateTo } = useNavigation();

  const command = metadata?.command as string;
  const targets = useMemo(() => (metadata?.targets ?? []) as EndpointTarget[], [metadata?.targets]);

  const endpointDetailsHref = getAppUrl({
    path: getEndpointDetailsPath({
      name: 'endpointActivityLog',
      selected_endpoint: targets[0]?.endpointId,
    }),
  });
  const hostsDetailsHref = getAppUrl({
    path: `/hosts/name/${targets[0]?.hostname}`,
  });

  const actionText = useMemo(() => {
    return command === 'isolate' ? `${ISOLATED_HOST} ` : `${RELEASED_HOST} `;
  }, [command]);

  const linkHref = useMemo(
    () => (targets[0]?.agentType === 'endpoint' ? endpointDetailsHref : hostsDetailsHref),
    [endpointDetailsHref, hostsDetailsHref, targets]
  );

  const onLinkClick = useCallback(
    (ev: React.MouseEvent<HTMLAnchorElement>) => {
      ev.preventDefault();
      return navigateTo({ url: linkHref });
    },
    [navigateTo, linkHref]
  );

  if (!targets.length) {
    return null;
  }

  return (
    <>
      {actionText}
      {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
      <EuiLink
        onClick={onLinkClick}
        href={linkHref}
        data-test-subj={`actions-link-${targets[0].endpointId}`}
      >
        {targets[0].hostname}
      </EuiLink>
      {targets.length > 1 && OTHER_ENDPOINTS(targets.length - 1)}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { UnifiedAttachmentEvent as default };
