/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// testsList :: {} -> list
export default (envObj) => {
  const xs = [];
  // one of these 2 needs to create the default index pattern
  if (envObj.PRODUCTS.includes('logstash')) {
    xs.push('management');
  } else {
    xs.push('sample_data');
  }

  // get the opt in/out banner out of the way early
  if (envObj.XPACK === 'YES') {
    xs.push('telemetry');
  }

  if (envObj.BEATS.includes('metricbeat')) {
    xs.push('metricbeat');
  }
  if (envObj.BEATS.includes('filebeat')) {
    xs.push('filebeat');
  }
  if (envObj.BEATS.includes('packetbeat')) {
    xs.push('packetbeat');
  }
  if (envObj.BEATS.includes('winlogbeat')) {
    xs.push('winlogbeat');
  }
  if (envObj.BEATS.includes('heartbeat')) {
    xs.push('heartbeat');
  }
  if (envObj.VM === 'ubuntu16_tar_ccs') {
    xs.push('ccs');
  }

  // with latest elasticsearch Js client, we can only run these watcher tests
  // which use the watcher API on a config with x-pack but without TLS (no security)
  if (envObj.VM === 'ubuntu16_tar') {
    xs.push('reporting');
  }

  if (envObj.XPACK === 'YES' && ['TRIAL', 'GOLD', 'PLATINUM'].includes(envObj.LICENSE)) {
    // we can't test enabling monitoring on this config because we already enable it through cluster settings for both clusters.
    if (envObj.VM !== 'ubuntu16_tar_ccs') {
      // monitoring is last because we switch to the elastic superuser here
      xs.push('monitoring');
    }
  }

  return xs;
};
