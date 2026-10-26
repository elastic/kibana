/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';
import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import type { EntityTypes } from '../../../common/http_api/shared/entity_type';
import { SCHEMA_SELECTOR_DOCS_LINKS } from '../../../common/constants';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';

interface SwitchSchemaMessageProps {
  dataTestSubj: string;
  nodeType: EntityTypes;
  targetSchema: DataSchemaFormat;
  onSwitchSchema: (schema: DataSchemaFormat) => void;
}

/** Empty state message offering to switch to the only schema that currently holds data. */
export function SwitchSchemaMessage({
  dataTestSubj,
  nodeType,
  targetSchema,
  onSwitchSchema,
}: SwitchSchemaMessageProps) {
  const {
    services: { telemetry },
  } = useKibanaContextForPlugin();

  const docsLink = SCHEMA_SELECTOR_DOCS_LINKS[nodeType];

  const handleSwitchSchema = useCallback(() => {
    onSwitchSchema(targetSchema);
    telemetry.reportSchemaSelectorInteraction({
      interaction: 'switch schema from empty state',
      schema_selected: targetSchema,
      schemas_available: [targetSchema],
    });
  }, [onSwitchSchema, targetSchema, telemetry]);

  return (
    <>
      <FormattedMessage
        id="xpack.infra.waffle.noDataInSelectedSchemaByNodeTypeMessage"
        defaultMessage="{nodeType, select, host {{switchSchema} to view hosts matching another schema.} pod {{switchSchema} to view Kubernetes pods matching another schema.} other {{switchSchema} to view entities matching another schema.}}"
        values={{
          nodeType,
          switchSchema: (
            <EuiLink data-test-subj={dataTestSubj} onClick={handleSwitchSchema}>
              {i18n.translate('xpack.infra.waffle.switchSchemaLink', {
                defaultMessage: 'Switch schema',
              })}
            </EuiLink>
          ),
        }}
      />{' '}
      {docsLink && (
        <EuiLink
          data-test-subj={`${dataTestSubj}LearnMore`}
          href={docsLink}
          target="_blank"
          external
        >
          {i18n.translate('xpack.infra.waffle.switchSchemaLearnMoreLink', {
            defaultMessage: 'Learn more',
          })}
        </EuiLink>
      )}
    </>
  );
}
