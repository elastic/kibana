/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlContentReference } from '@kbn/elastic-assistant-common';
import React, { useCallback } from 'react';
import { EuiLink } from '@elastic/eui';
import type { ContentReferenceNode } from '../content_reference_parser';
import { PopoverReference } from './popover_reference';
import { useKibana } from '../../../../common/lib/kibana';

interface Props {
  contentReferenceNode: ContentReferenceNode;
  esqlContentReference: EsqlContentReference;
}

export const EsqlQueryReference: React.FC<Props> = ({
  contentReferenceNode,
  esqlContentReference,
}) => {
  const {
    discover: { locator },
    application: { navigateToApp },
  } = useKibana().services;

  const onClick = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      if (!locator) {
        return;
      }
      const url = await locator.getLocation({
        query: {
          esql: esqlContentReference.query,
        },
      });

      navigateToApp(url.app, {
        path: url.path,
        openInNewTab: true,
      });
    },
    [locator, esqlContentReference.query, navigateToApp]
  );

  return (
    <PopoverReference
      contentReferenceCount={contentReferenceNode.contentReferenceCount}
      data-test-subj="EsqlQueryReference"
    >
      <EuiLink onClick={onClick}>{esqlContentReference.label}</EuiLink>
    </PopoverReference>
  );
};
