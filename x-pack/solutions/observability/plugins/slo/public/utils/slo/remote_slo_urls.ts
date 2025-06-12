/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from '@kbn/rison';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import path from 'path';
import { paths } from '../../../common/locators/paths';

function createBaseRemoteSloDetailsUrl(
  slo: SLOWithSummaryResponse,
  spaceId: string = 'default'
): URL | undefined {
  if (!slo.remote || slo.remote.kibanaUrl === '') {
    return undefined;
  }

  const spacePath = spaceId !== 'default' ? `/s/${spaceId}` : '';
  const detailsPath = paths.sloDetails(slo.id, slo.instanceId);

  const remoteUrl = new URL(path.join(spacePath, detailsPath), slo.remote.kibanaUrl);
  return remoteUrl;
}

export function createRemoteSloDetailsUrl(
  slo: SLOWithSummaryResponse,
  spaceId: string = 'default'
) {
  return createBaseRemoteSloDetailsUrl(slo, spaceId)?.toString();
}

export function createRemoteSloDeleteUrl(slo: SLOWithSummaryResponse, spaceId: string = 'default') {
  const remoteUrl = createBaseRemoteSloDetailsUrl(slo, spaceId);
  if (!remoteUrl) {
    return undefined;
  }

  remoteUrl.searchParams.append('delete', 'true');
  return remoteUrl.toString();
}

export function createRemoteSloResetUrl(slo: SLOWithSummaryResponse, spaceId: string = 'default') {
  const remoteUrl = createBaseRemoteSloDetailsUrl(slo, spaceId);
  if (!remoteUrl) {
    return undefined;
  }

  remoteUrl.searchParams.append('reset', 'true');
  return remoteUrl.toString();
}

export function createRemoteSloEnableUrl(slo: SLOWithSummaryResponse, spaceId: string = 'default') {
  const remoteUrl = createBaseRemoteSloDetailsUrl(slo, spaceId);
  if (!remoteUrl) {
    return undefined;
  }

  remoteUrl.searchParams.append('enable', 'true');
  return remoteUrl.toString();
}

export function createRemoteSloDisableUrl(
  slo: SLOWithSummaryResponse,
  spaceId: string = 'default'
) {
  const remoteUrl = createBaseRemoteSloDetailsUrl(slo, spaceId);
  if (!remoteUrl) {
    return undefined;
  }

  remoteUrl.searchParams.append('disable', 'true');
  return remoteUrl.toString();
}

export function createRemoteSloEditUrl(slo: SLOWithSummaryResponse, spaceId: string = 'default') {
  if (!slo.remote || slo.remote.kibanaUrl === '') {
    return undefined;
  }

  const spacePath = spaceId !== 'default' ? `/s/${spaceId}` : '';
  const editPath = paths.sloEdit(slo.id);
  const remoteUrl = new URL(path.join(spacePath, editPath), slo.remote.kibanaUrl);

  return remoteUrl.toString();
}

export function createRemoteSloCloneUrl(slo: SLOWithSummaryResponse, spaceId: string = 'default') {
  if (!slo.remote || slo.remote.kibanaUrl === '') {
    return undefined;
  }

  const spacePath = spaceId !== 'default' ? `/s/${spaceId}` : '';
  const clonePath = paths.sloCreateWithEncodedForm(
    encode({ ...slo, name: `[Copy] ${slo.name}`, id: undefined })
  );
  const remoteUrl = new URL(path.join(spacePath, clonePath), slo.remote.kibanaUrl);
  return remoteUrl.toString();
}
