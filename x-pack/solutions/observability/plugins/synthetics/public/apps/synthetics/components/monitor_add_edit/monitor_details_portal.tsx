/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useHistory } from 'react-router-dom';
import { EuiLink, EuiIcon } from '@elastic/eui';
import { InPortal } from 'react-reverse-portal';
import { useSelectedLocation } from '../monitor_details/hooks/use_selected_location';
import { useUrlSpaceId } from '../../hooks/use_url_space_id';
import { MonitorDetailsLinkPortalNode } from './portals';

interface Props {
  name: string;
  configId: string;
  locationId?: string;
  updateUrl?: boolean;
  // Forwarded to the breadcrumb URL so the monitor detail page knows the
  // monitor lives on a remote (CCS) cluster and skips the local saved-object
  // fetch that would otherwise 404.
  remoteName?: string;
}

export const MonitorDetailsLinkPortal = ({
  name,
  configId,
  locationId,
  updateUrl,
  remoteName,
}: Props) => {
  return (
    <InPortal node={MonitorDetailsLinkPortalNode}>
      {locationId ? (
        <MonitorDetailsLinkWithLocation
          name={name}
          configId={configId}
          locationId={locationId}
          updateUrl={updateUrl}
          remoteName={remoteName}
        />
      ) : (
        <MonitorDetailsLink name={name} configId={configId} remoteName={remoteName} />
      )}
    </InPortal>
  );
};

const MonitorDetailsLinkWithLocation = ({
  name,
  configId,
  locationId,
  updateUrl,
  remoteName,
}: Props) => {
  const selectedLocation = useSelectedLocation({ updateUrl });
  const spaceId = useUrlSpaceId();

  let locId = locationId;

  if (selectedLocation?.id && !locationId) {
    locId = selectedLocation.id;
  }

  const history = useHistory();
  const href = history.createHref({
    pathname: `monitor/${configId}`,
    search: buildSearch({ locationId: locId, spaceId, remoteName }),
  });
  return <MonitorLink href={href} name={name} />;
};

const MonitorDetailsLink = ({ name, configId, remoteName }: Props) => {
  const spaceId = useUrlSpaceId();
  const history = useHistory();
  const href = history.createHref({
    pathname: `monitor/${configId}`,
    search: buildSearch({ spaceId, remoteName }),
  });
  return <MonitorLink href={href} name={name} />;
};

const buildSearch = ({
  locationId,
  spaceId,
  remoteName,
}: {
  locationId?: string;
  spaceId?: string;
  remoteName?: string;
}): string | undefined => {
  const params = new URLSearchParams();
  if (locationId) params.set('locationId', locationId);
  if (spaceId) params.set('spaceId', spaceId);
  if (remoteName) params.set('remoteName', remoteName);
  const qs = params.toString();
  return qs ? `?${qs}` : undefined;
};

const MonitorLink = ({ href, name }: { href: string; name: string }) => {
  return (
    <EuiLink data-test-subj="syntheticsMonitorDetailsLinkLink" href={href}>
      <EuiIcon type="chevronSingleLeft" aria-hidden={true} /> {name}
    </EuiLink>
  );
};
