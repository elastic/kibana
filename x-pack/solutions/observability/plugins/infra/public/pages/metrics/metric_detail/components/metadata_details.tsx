/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useState, useCallback, useMemo } from 'react';
import { get } from 'lodash';
import {
  EuiButtonIcon,
  EuiFlexGrid,
  EuiFlexItem,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import styled from '@emotion/styled';
import type { InfraMetadata } from '../../../../../common/http_api';
import { firstValue } from '../../../../utils/first_value';
import { MetadataContext } from '../containers/metadata_context';

interface FieldDef {
  // ECS path, also the stable key used to look a field up by name.
  field: string;
  // Tried in order when `field` is empty. OpenTelemetry resource attributes reach this response
  // either under their ECS alias (`os.type` -> `host.os.platform`) or verbatim under
  // `resource.attributes.*`, and some ECS fields have no semantic conventions equivalent at all.
  fallbacks?: string[];
  label: string;
  isBoolean?: boolean;
}

const FIELDS = [
  {
    field: 'cloud.instance.id',
    fallbacks: ['cloud.resource_id', 'resource.attributes.cloud.resource_id'],
    label: i18n.translate('xpack.infra.nodeDetails.labels.instanceId', {
      defaultMessage: 'Instance ID',
    }),
  },
  {
    field: 'cloud.provider',
    fallbacks: ['resource.attributes.cloud.provider'],
    label: i18n.translate('xpack.infra.nodeDetails.labels.cloudProvider', {
      defaultMessage: 'Cloud Provider',
    }),
  },
  {
    field: 'host.os.name',
    fallbacks: ['resource.attributes.os.name', 'host.os.platform', 'resource.attributes.os.type'],
    label: i18n.translate('xpack.infra.nodeDetails.labels.operatinSystem', {
      defaultMessage: 'Operating System',
    }),
  },
  {
    // No OpenTelemetry semantic conventions equivalent.
    field: 'host.os.kernel',
    label: i18n.translate('xpack.infra.nodeDetails.labels.kernelVersion', {
      defaultMessage: 'Kernel Version',
    }),
  },
  {
    field: 'host.name',
    fallbacks: ['resource.attributes.host.name'],
    label: i18n.translate('xpack.infra.nodeDetails.labels.hostname', {
      defaultMessage: 'Hostname',
    }),
  },
  {
    // No OpenTelemetry semantic conventions equivalent.
    field: 'host.containerized',
    label: i18n.translate('xpack.infra.nodeDetails.labels.containerized', {
      defaultMessage: 'Containerized',
    }),
    isBoolean: true,
  },
  {
    field: 'cloud.project.id',
    label: i18n.translate('xpack.infra.nodeDetails.labels.projectId', {
      defaultMessage: 'Project ID',
    }),
  },
  {
    field: 'cloud.availability_zone',
    fallbacks: ['resource.attributes.cloud.availability_zone'],
    label: i18n.translate('xpack.infra.nodeDetails.labels.availabilityZone', {
      defaultMessage: 'Availability Zone',
    }),
  },
  {
    field: 'cloud.machine.type',
    fallbacks: ['host.type', 'resource.attributes.host.type'],
    label: i18n.translate('xpack.infra.nodeDetails.labels.machineType', {
      defaultMessage: 'Machine Type',
    }),
  },
  {
    field: 'cloud.instance.name',
    label: i18n.translate('xpack.infra.nodeDetails.labels.instanceName', {
      defaultMessage: 'Instance Name',
    }),
  },
] as FieldDef[];

const NOT_AVAILABLE = '--';

const getLabelForField = ({ field }: FieldDef) => {
  const fieldDef = FIELDS.find((f) => f.field === field);
  if (!fieldDef) return field;
  return fieldDef.label;
};

const getValueForField = (metadata: InfraMetadata, { field, fallbacks, isBoolean }: FieldDef) => {
  if (isBoolean) {
    return get(metadata.info, field, false)
      ? i18n.translate('xpack.infra.nodeDetails.yes', { defaultMessage: 'Yes' })
      : i18n.translate('xpack.infra.nodeDetails.no', { defaultMessage: 'No' });
  }

  return (
    firstValue(...[field, ...(fallbacks ?? [])].map((path) => get(metadata.info, path))) ??
    NOT_AVAILABLE
  );
};

interface Props {
  fields?: string[];
}

const NUMBER_OF_COLUMNS = 4;

export const MetadataDetails = (props: Props) => {
  const [isOpen, setControlState] = useState<boolean>(false);

  const toggleIsOpen = useCallback(
    () => (isOpen ? setControlState(false) : setControlState(true)),
    [isOpen]
  );

  const filteredFields = useMemo(() => {
    if (props.fields && props.fields.length) {
      return props.fields
        .map((field) => {
          const fieldDef = FIELDS.find((f) => f.field === field);
          if (fieldDef) {
            return fieldDef;
          }
        })
        .filter((f) => f) as FieldDef[];
    } else {
      return FIELDS;
    }
  }, [props.fields]);
  const fields = useMemo(
    () => (isOpen ? filteredFields : filteredFields.slice(0, NUMBER_OF_COLUMNS)),
    [filteredFields, isOpen]
  );
  const metadata = useContext(MetadataContext);

  if (!metadata) {
    return null;
  }

  return (
    <MetadataContainer>
      {filteredFields.length > NUMBER_OF_COLUMNS ? (
        <Controls>
          <EuiToolTip
            content={i18n.translate('xpack.infra.nodeDetails.labels.showMoreDetails', {
              defaultMessage: 'Show more details',
            })}
            disableScreenReaderOutput
          >
            <EuiButtonIcon
              data-test-subj="infraMetadataDetailsButton"
              iconType={isOpen ? 'chevronSingleUp' : 'chevronSingleDown'}
              onClick={toggleIsOpen}
              aria-label={i18n.translate('xpack.infra.nodeDetails.labels.showMoreDetails', {
                defaultMessage: 'Show more details',
              })}
            />
          </EuiToolTip>
        </Controls>
      ) : null}
      <EuiFlexGrid columns={NUMBER_OF_COLUMNS} style={{ flexGrow: 1 }} gutterSize="s">
        {fields.map((field) => (
          <EuiFlexItem
            key={field.field}
            data-test-subj={`infraMetadataDetailsItem-${field.field}`}
            style={{ minWidth: 0 }}
          >
            <EuiTitle size="xs">
              <h5>{getLabelForField(field)}</h5>
            </EuiTitle>
            <EuiText>{getValueForField(metadata, field)}</EuiText>
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    </MetadataContainer>
  );
};

const MetadataContainer = styled.div`
  border-top: ${(props) => props.theme.euiTheme.border.thin};
  border-bottom: ${(props) => props.theme.euiTheme.border.thin};
  padding: ${(props) => props.theme.euiTheme.size.m} 0;
  margin-bottom: ${(props) => props.theme.euiTheme.size.m};
  display: flex;
`;

const Controls = styled.div`
  flex-grow: 0;
  margin-right: ${(props) => props.theme.euiTheme.size.m};
  min-width: 0px;
`;
