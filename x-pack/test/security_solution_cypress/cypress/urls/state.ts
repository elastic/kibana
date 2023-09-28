/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ABSOLUTE_DATE_RANGE = {
  url: '/app/security/network/flows/?timerange=(global:(linkTo:!(timeline),timerange:(from:%272019-08-01T20:03:29.186Z%27,kind:absolute,to:%272019-08-01T20:33:29.186Z%27)),timeline:(linkTo:!(global),timerange:(from:%272019-08-01T20:03:29.186Z%27,kind:absolute,to:%272019-08-01T20:33:29.186Z%27)))',

  urlWithTimestamps:
    '/app/security/network/flows/?timerange=(global:(linkTo:!(timeline),timerange:(from:1564689809186,kind:absolute,to:1564691609186)),timeline:(linkTo:!(global),timerange:(from:1564689809186,kind:absolute,to:1564691609186)))',
  urlUnlinked:
    '/app/security/network/flows/?timerange=(global:(linkTo:!(),timerange:(from:%272019-08-01T20:03:29.186Z%27,kind:absolute,to:%272019-08-01T20:33:29.186Z%27)),timeline:(linkTo:!(),timerange:(from:%272019-08-02T20:03:29.186Z%27,kind:absolute,to:%272019-08-02T21:03:29.186Z%27)))',
  urlKqlNetworkNetwork: `/app/security/network/flows/?query=(language:kuery,query:'source.ip:%20"10.142.0.9"')&timerange=(global:(linkTo:!(timeline),timerange:(from:%272019-08-01T20:03:29.186Z%27,kind:absolute,to:%272019-08-01T20:33:29.186Z%27)),timeline:(linkTo:!(global),timerange:(from:%272019-08-01T20:03:29.186Z%27,kind:absolute,to:%272019-08-01T20:33:29.186Z%27)))`,
  urlKqlNetworkHosts: `/app/security/network/flows/?query=(language:kuery,query:'source.ip:%20"10.142.0.9"')&timerange=(global:(linkTo:!(timeline),timerange:(from:%272019-08-01T20:03:29.186Z%27,kind:absolute,to:%272019-08-01T20:33:29.186Z%27)),timeline:(linkTo:!(global),timerange:(from:%272019-08-01T20:03:29.186Z%27,kind:absolute,to:%272019-08-01T20:33:29.186Z%27)))`,
  urlKqlHostsNetwork: `/app/security/hosts/allHosts?query=(language:kuery,query:'source.ip:%20"10.142.0.9"')&timerange=(global:(linkTo:!(timeline),timerange:(from:%272019-08-01T20:03:29.186Z%27,kind:absolute,to:%272019-08-01T20:33:29.186Z%27)),timeline:(linkTo:!(global),timerange:(from:%272019-08-01T20:03:29.186Z%27,kind:absolute,to:%272019-08-01T20:33:29.186Z%27)))`,
  urlKqlHostsHosts: `/app/security/hosts/allHosts?query=(language:kuery,query:'source.ip:%20"10.142.0.9"')&timerange=(global:(linkTo:!(timeline),timerange:(from:%272019-08-01T20:03:29.186Z%27,kind:absolute,to:%272019-08-01T20:33:29.186Z%27)),timeline:(linkTo:!(global),timerange:(from:%272019-08-01T20:03:29.186Z%27,kind:absolute,to:%272019-08-01T20:33:29.186Z%27)))`,
  urlHost:
    '/app/security/hosts/allHosts?timerange=(global:(linkTo:!(timeline),timerange:(from:%272019-08-01T20:03:29.186Z%27,kind:absolute,to:%272019-08-01T20:33:29.186Z%27)),timeline:(linkTo:!(global),timerange:(from:%272019-08-01T20:03:29.186Z%27,kind:absolute,to:%272019-08-01T20:33:29.186Z%27)))',
  urlHostNew:
    '/app/security/hosts/allHosts?timerange=(global:(linkTo:!(timeline),timerange:(from:%272019-08-01T20:03:29.186Z%27,kind:absolute,to:%272023-01-01T21:33:29.186Z%27)),timeline:(linkTo:!(global),timerange:(from:%272019-08-01T20:03:29.186Z%27,kind:absolute,to:%272023-01-01T21:33:29.186Z%27)))',

  urlFiltersHostsHosts:
    '/app/security/hosts/allHosts?filters=!((%27$state%27:(store:globalState),meta:(alias:!n,disabled:!f,key:host.name,negate:!f,params:(query:test-host),type:phrase),query:(match_phrase:(host.name:(query:test-host)))),(%27$state%27:(store:appState),meta:(alias:!n,disabled:!f,key:host.os.name,negate:!f,params:(query:test-os),type:phrase),query:(match_phrase:(host.os.name:(query:test-os)))))',
};
