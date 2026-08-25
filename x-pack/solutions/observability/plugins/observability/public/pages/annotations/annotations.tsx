/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';

import { i18n } from '@kbn/i18n';
import { useAnnotationsPrivileges } from './annotations_privileges';
import { CreateAnnotationBtn } from './create_annotation_btn';
import { AnnotationsList } from './annotations_list';
import { useKibana } from '../../utils/kibana_react';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { paths } from '../../../common/locators/paths';
import { HeaderMenu } from '../overview/components/header_menu/header_menu';

export const ANNOTATIONS_PAGE_ID = 'annotations-container';

export function AnnotationsPage() {
  const {
    http: { basePath },
    serverless,
  } = useKibana().services;
  const { ObservabilityPageTemplate } = usePluginContext();

  const checkPrivileges = useAnnotationsPrivileges();

  useBreadcrumbs(
    [
      {
        href: basePath.prepend(paths.observability.annotations),
        text: i18n.translate('xpack.observability.breadcrumbs.annotationsLinkText', {
          defaultMessage: 'Annotations',
        }),
        deepLinkId: 'observability-overview',
      },
    ],
    { serverless }
  );

  return (
    <ObservabilityPageTemplate
      data-test-subj="annotationsPage"
      pageHeader={{
        pageTitle: i18n.translate('xpack.observability.annotations.heading', {
          defaultMessage: 'Annotations',
        }),
        rightSideItems: [<CreateAnnotationBtn />],
      }}
    >
      <HeaderMenu />
      {checkPrivileges ? checkPrivileges : <AnnotationsList />}
    </ObservabilityPageTemplate>
  );
}
