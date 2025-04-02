/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import React, { useEffect } from 'react';
// import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
// import {
//   uiMetricService,
//   UNIVERSAL_ENTITY_FLYOUT_OPENED,
// } from '@kbn/cloud-security-posture-common/utils/ui_metrics';
// import { METRIC_TYPE } from '@kbn/analytics';
// import type { EntityEcs } from '@kbn/securitysolution-ecs/src/entity';
// import type { EsHitRecord } from '@kbn/discover-utils';
// import { useGetMisconfigurationFindings } from '@kbn/cloud-security-posture/src/hooks/use_get_misconfiguration_finding';
// import { FlyoutNavigation } from '../../../shared/components/flyout_navigation';
// import { UniversalEntityFlyoutContent } from '../../../entity_details/universal_right/content';
// import { UniversalEntityFlyoutHeader } from '../../../entity_details/universal_right/header';
// import { FindingsMisconfigurationFlyoutHeader } from './header';

// export interface FindingsMisconfigurationPanelProps extends Record<string, unknown> {
//   resourceId: string;
//   ruleId: string;
// }

// export interface FindingsMisconfigurationPanelExpandableFlyoutProps extends FlyoutPanelProps {
//   key: 'findings-misconfiguration-panel';
//   params: FindingsMisconfigurationPanelProps;
// }

// const isDate = (value: unknown): value is Date => value instanceof Date;

// export const FindingsMisconfigurationPanel = ({
//   resourceId,
//   ruleId,
// }: FindingsMisconfigurationPanelProps) => {
//   // const docTimestamp = source?.['@timestamp'];
//   // const timestamp = isDate(docTimestamp) ? docTimestamp : undefined;

//   const { data: dataIsenk } = useGetMisconfigurationFindings({
//     query: {
//       bool: {
//         filter: [
//           {
//             term: {
//               'rule.id': ruleId,
//             },
//           },
//           {
//             term: {
//               'resource.id': resourceId,
//             },
//           },
//         ],
//       },
//     },
//     enabled: true,
//     pageSize: 1,
//   });
//   const dataSource = dataIsenk?.result.hits[0]._source;
//   const dateFormatted = new Date(dataSource?.['@timestamp'] || '');
//   const rulesTags = dataSource?.rule.tags;
//   const resourceName = dataSource?.resource.name;
//   const vendor = dataSource?.observer.vendor;
//   const ruleBenchmarkId = dataSource?.rule.benchmark.id;
//   const ruleBenchmarkName = dataSource?.rule.benchmark.name;
//   return (
//     <>
//       <FlyoutNavigation flyoutIsExpandable={false} />
//       <FindingsMisconfigurationFlyoutHeader
//         ruleName={dataSource?.rule.name || ''}
//         timestamp={dateFormatted}
//         rulesTags={rulesTags}
//         resourceName={resourceName}
//         vendor={vendor}
//         ruleBenchmarkName={ruleBenchmarkName}
//         ruleBenchmarkId={ruleBenchmarkId}
//       />
//       {/* <UniversalEntityFlyoutHeader entity={entity} timestamp={timestamp} />
//       <UniversalEntityFlyoutContent source={source} /> */}
//     </>
//   );
// };

// FindingsMisconfigurationPanel.displayName = 'FindingsMisconfigurationPanel';
