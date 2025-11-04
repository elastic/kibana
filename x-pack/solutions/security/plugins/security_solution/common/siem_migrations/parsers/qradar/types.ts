/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QradarResourceType } from '../../model/vendor/common/qradar.gen';

interface ParsedQradarXml {
  custom_rule?: QradarRule[];
  qidmap?: {
    severity: string[];
    qname: string[];
    qdescription: string[];
  };

  sensordevicetype?: {
    //
    // <sensordevicetype>
    // 	<uniqueperhost>false</uniqueperhost>
    // 	<default_protocol>0</default_protocol>
    // 	<devicetypecredibility>8</devicetypecredibility>
    // 	<dsmparameter></dsmparameter>
    // 	<latest_version>20250505095</latest_version>
    // 	<devicecategoryid>1</devicecategoryid>
    // 	<devicetypedescription>IBM AIX Server</devicetypedescription>
    // 	<defaultlanguageid>1</defaultlanguageid>
    // 	<id>85</id>
    // 	<devicetypename>IBMAIXServer</devicetypename>
    // 	<devicetypeoverride>0</devicetypeoverride>
    // 	<mask>0</mask>
    // </sensordevicetype>
    devicetypename: string[];
    devicetypedescription: string[];
  };
}

export interface QradarRule {
  id: string;
  rule_data: string;
  rule_type: string;
  description: string;
  title: string;
}

export interface QradarRuleData {
  rule: {
    name: string;
    notes: string;
    responses: {
      newEvent: string[];
    };
  };
}

export interface ResourceDetailType {
  name: string;
  description: string;
  content: string;
}

export type ResourceTypeMap = Record<QradarResourceType, ResourceDetailType[] | undefined>;
