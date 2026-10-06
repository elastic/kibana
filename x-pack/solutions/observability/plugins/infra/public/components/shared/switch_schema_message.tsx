/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { EntityTypes } from '../../../common/http_api/shared/entity_type';
import { SCHEMA_SELECTOR_DOCS_LINK } from '../../../common/constants';

export function SwitchSchemaMessage({
  dataTestSubj,
  nodeType,
}: {
  dataTestSubj: string;
  nodeType: EntityTypes;
}) {
  return (
    <FormattedMessage
      id="xpack.infra.waffle.noDataInSelectedSchemaByNodeTypeMessage"
      defaultMessage="{nodeType, select, host {{switchSchema} to view hosts matching another schema.} pod {{switchSchema} to view Kubernetes pods matching another schema.} other {{switchSchema} to view entities matching another schema.}}"
      values={{
        nodeType,
        switchSchema: (
          <EuiLink data-test-subj={dataTestSubj} target="_blank" href={SCHEMA_SELECTOR_DOCS_LINK}>
            {i18n.translate('xpack.infra.waffle.switchSchemaDocsLink', {
              defaultMessage: 'Switch schema',
            })}
          </EuiLink>
        ),
      }}
    />
  );
}
