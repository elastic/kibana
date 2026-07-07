/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSlo } from '../../data/slo/slo';
import {
  createRemoteSloCloneUrl,
  createRemoteSloDeleteUrl,
  createRemoteSloDetailsUrl,
  createRemoteSloDisableUrl,
  createRemoteSloEditUrl,
  createRemoteSloEnableUrl,
} from './remote_slo_urls';

describe('remote SLO URLs Utils', () => {
  it('returns undefined for local SLOs', () => {
    const localSlo = buildSlo({ id: 'fixed-id' });

    expect(createRemoteSloDetailsUrl(localSlo)).toMatchInlineSnapshot(`undefined`);
    expect(createRemoteSloDeleteUrl(localSlo)).toMatchInlineSnapshot(`undefined`);
    expect(createRemoteSloEnableUrl(localSlo)).toMatchInlineSnapshot(`undefined`);
    expect(createRemoteSloDisableUrl(localSlo)).toMatchInlineSnapshot(`undefined`);
    expect(createRemoteSloEditUrl(localSlo)).toMatchInlineSnapshot(`undefined`);
    expect(createRemoteSloCloneUrl(localSlo)).toMatchInlineSnapshot(`undefined`);
  });

  it('returns undefined for remote SLOs with empty kibanaUrl', () => {
    const remoteSloWithoutKibanaUrl = buildSlo({
      id: 'fixed-id',
      remote: { kibanaUrl: '', remoteName: 'remote_cluster' },
    });

    expect(createRemoteSloDetailsUrl(remoteSloWithoutKibanaUrl)).toMatchInlineSnapshot(`undefined`);
    expect(createRemoteSloDeleteUrl(remoteSloWithoutKibanaUrl)).toMatchInlineSnapshot(`undefined`);
    expect(createRemoteSloEnableUrl(remoteSloWithoutKibanaUrl)).toMatchInlineSnapshot(`undefined`);
    expect(createRemoteSloDisableUrl(remoteSloWithoutKibanaUrl)).toMatchInlineSnapshot(`undefined`);
    expect(createRemoteSloEditUrl(remoteSloWithoutKibanaUrl)).toMatchInlineSnapshot(`undefined`);
    expect(createRemoteSloCloneUrl(remoteSloWithoutKibanaUrl)).toMatchInlineSnapshot(`undefined`);
  });

  it('returns the correct URLs for remote SLOs with kibanaUrl', () => {
    const remoteSlo = buildSlo({
      id: 'fixed-id',
      remote: { kibanaUrl: 'https://cloud.elast.co/kibana', remoteName: 'remote_cluster' },
    });

    expect(createRemoteSloDetailsUrl(remoteSlo)).toMatchInlineSnapshot(
      `"https://cloud.elast.co/app/slos/fixed-id?"`
    );
    expect(createRemoteSloDeleteUrl(remoteSlo)).toMatchInlineSnapshot(
      `"https://cloud.elast.co/app/slos/fixed-id?delete=true"`
    );
    expect(createRemoteSloEnableUrl(remoteSlo)).toMatchInlineSnapshot(
      `"https://cloud.elast.co/app/slos/fixed-id?enable=true"`
    );
    expect(createRemoteSloDisableUrl(remoteSlo)).toMatchInlineSnapshot(
      `"https://cloud.elast.co/app/slos/fixed-id?disable=true"`
    );
    expect(createRemoteSloEditUrl(remoteSlo)).toMatchInlineSnapshot(
      `"https://cloud.elast.co/app/slos/edit/fixed-id"`
    );
    expect(createRemoteSloCloneUrl(remoteSlo)).toMatchInlineSnapshot(
      `"https://cloud.elast.co/app/slos/create?_a=(budgetingMethod%3Aoccurrences%2Cdescription%3A%27some%20description%20useful%27%2CgroupBy%3A%27*%27%2Cindicator%3A(params%3A(dataViewId%3Asome-data-view-id%2Cfilter%3A%27baz%3A%20foo%20and%20bar%20%3E%202%27%2Cgood%3A%27http_status%3A%202xx%27%2Cindex%3Asome-index%2CtimestampField%3Acustom_timestamp%2Ctotal%3A%27a%20query%27)%2Ctype%3Asli.kql.custom)%2Cname%3A%27%5BCopy%5D%20super%20important%20level%20service%27%2Cobjective%3A(target%3A0.98)%2Csettings%3A(frequency%3A%271m%27%2CpreventInitialBackfill%3A!f%2CsyncDelay%3A%271m%27)%2Ctags%3A!(k8s%2Cproduction%2Ccritical)%2CtimeWindow%3A(duration%3A%2730d%27%2Ctype%3Arolling))"`
    );
  });

  it('returns the correct URLs including spaceId for remote SLOs with kibanaUrl', () => {
    const remoteSlo = buildSlo({
      id: 'fixed-id',
      remote: { kibanaUrl: 'https://cloud.elast.co/kibana', remoteName: 'remote_cluster' },
    });

    expect(createRemoteSloDetailsUrl(remoteSlo, 'my-custom-space')).toMatchInlineSnapshot(
      `"https://cloud.elast.co/s/my-custom-space/app/slos/fixed-id?"`
    );
    expect(createRemoteSloDeleteUrl(remoteSlo, 'my-custom-space')).toMatchInlineSnapshot(
      `"https://cloud.elast.co/s/my-custom-space/app/slos/fixed-id?delete=true"`
    );
    expect(createRemoteSloEnableUrl(remoteSlo, 'my-custom-space')).toMatchInlineSnapshot(
      `"https://cloud.elast.co/s/my-custom-space/app/slos/fixed-id?enable=true"`
    );
    expect(createRemoteSloDisableUrl(remoteSlo, 'my-custom-space')).toMatchInlineSnapshot(
      `"https://cloud.elast.co/s/my-custom-space/app/slos/fixed-id?disable=true"`
    );
    expect(createRemoteSloEditUrl(remoteSlo, 'my-custom-space')).toMatchInlineSnapshot(
      `"https://cloud.elast.co/s/my-custom-space/app/slos/edit/fixed-id"`
    );
    expect(createRemoteSloCloneUrl(remoteSlo, 'my-custom-space')).toMatchInlineSnapshot(
      `"https://cloud.elast.co/s/my-custom-space/app/slos/create?_a=(budgetingMethod%3Aoccurrences%2Cdescription%3A%27some%20description%20useful%27%2CgroupBy%3A%27*%27%2Cindicator%3A(params%3A(dataViewId%3Asome-data-view-id%2Cfilter%3A%27baz%3A%20foo%20and%20bar%20%3E%202%27%2Cgood%3A%27http_status%3A%202xx%27%2Cindex%3Asome-index%2CtimestampField%3Acustom_timestamp%2Ctotal%3A%27a%20query%27)%2Ctype%3Asli.kql.custom)%2Cname%3A%27%5BCopy%5D%20super%20important%20level%20service%27%2Cobjective%3A(target%3A0.98)%2Csettings%3A(frequency%3A%271m%27%2CpreventInitialBackfill%3A!f%2CsyncDelay%3A%271m%27)%2Ctags%3A!(k8s%2Cproduction%2Ccritical)%2CtimeWindow%3A(duration%3A%2730d%27%2Ctype%3Arolling))"`
    );
  });
});
