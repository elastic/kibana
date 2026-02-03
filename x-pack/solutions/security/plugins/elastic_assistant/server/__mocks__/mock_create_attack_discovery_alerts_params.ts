/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateAttackDiscoveryAlertsParams } from '@kbn/elastic-assistant-common';

export const mockCreateAttackDiscoveryAlertsParams: CreateAttackDiscoveryAlertsParams = {
  alertsContextCount: 59,
  anonymizedAlerts: [
    {
      pageContent:
        '@timestamp,2025-04-23T06:10:57.341Z\n_id,156e8cceff47bbb4a17fe00b6a5c57500785cae79fd54944bb12e8a214b1778e\nagent.id,caaf3b95-7314-497c-8100-a13848468ee8\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nhost.name,d25f9128-820e-4998-a26d-0c62507541b4\nhost.os.name,Linux\nhost.os.version,10.12\nkibana.alert.original_time,2025-04-27T10:46:13.423Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,high\nprocess.executable,C:/fake/lsass.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,lsass.exe\nprocess.pid,2\nuser.domain,326lwhiqeg\nuser.name,c8db5601-e6fd-44b4-b645-21855715ce0a',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-23T06:10:57.340Z\n_id,b7c81c86e923a95211d73185afcfbb659d6cb7919fea74d2bce8186cbf15221d\nagent.id,caaf3b95-7314-497c-8100-a13848468ee8\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nhost.name,d25f9128-820e-4998-a26d-0c62507541b4\nhost.os.name,Linux\nhost.os.version,10.12\nkibana.alert.original_time,2025-04-26T06:49:04.423Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,high\nprocess.executable,C:/fake/lsass.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,lsass.exe\nprocess.pid,2\nuser.domain,6yedwajn9r\nuser.name,96908c11-7d55-48fe-a0dc-2a6de3b4736a',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-23T06:10:57.339Z\n_id,1f48440803875db9869fefdbc613adf3d39532b701c415eab6b715b16c3891da\nagent.id,caaf3b95-7314-497c-8100-a13848468ee8\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nhost.name,d25f9128-820e-4998-a26d-0c62507541b4\nhost.os.name,Linux\nhost.os.version,10.12\nkibana.alert.original_time,2025-04-23T18:26:41.423Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,high\nprocess.executable,C:/fake/notepad.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,notepad.exe\nprocess.pid,2\nuser.domain,s6t47lzoo0\nuser.name,256b6a76-729e-42de-abb1-1b1583f1b0ba',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-23T06:10:57.338Z\n_id,0614e695ff78ec8b96e46a96e4f52023e738cd8d4ef710a0eb9bbc05f90f6921\nagent.id,caaf3b95-7314-497c-8100-a13848468ee8\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nhost.name,d25f9128-820e-4998-a26d-0c62507541b4\nhost.os.name,Linux\nhost.os.version,10.12\nkibana.alert.original_time,2025-04-23T12:54:11.423Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,high\nprocess.executable,C:/fake/iexlorer.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,iexlorer.exe\nprocess.pid,2\nuser.domain,uvae2bp3di\nuser.name,e3a53869-c1be-459f-bf07-26ad89afc110',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-23T06:10:57.337Z\n_id,966029c8fb82a63c5c6aaa274b7e23da87a34d5a6e854d8b6f3f6047126d35ea\nagent.id,caaf3b95-7314-497c-8100-a13848468ee8\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nfile.hash.sha256,fake file sha256\nfile.name,fake_malware.exe\nfile.path,C:/fake_malware.exe\nhost.name,d25f9128-820e-4998-a26d-0c62507541b4\nhost.os.name,Linux\nhost.os.version,10.12\nkibana.alert.original_time,2025-04-23T11:24:20.423Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,system\nprocess.executable,C:/malware.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,malware writer\nprocess.pid,2\nuser.domain,ffozn2oulm\nuser.name,d90db9ba-e964-4cf2-a88d-0f1b0fbffea1',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-23T06:10:57.333Z\n_id,696ceb46588c6f0a191a528f57d63a22e8d0565fc856e88ccefb5c72fd60d600\nagent.id,caaf3b95-7314-497c-8100-a13848468ee8\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nfile.hash.sha256,fake file sha256\nfile.name,fake_malware.exe\nfile.path,C:/fake_malware.exe\nhost.name,d25f9128-820e-4998-a26d-0c62507541b4\nhost.os.name,Linux\nhost.os.version,10.12\nkibana.alert.original_time,2025-04-23T10:07:33.423Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,system\nprocess.executable,C:/malware.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,malware writer\nprocess.pid,2\nuser.domain,q6g9jm2hmj\nuser.name,1b326a75-a58c-4be5-bc1a-099cd1058622',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-23T06:10:57.331Z\n_id,3ba7ccb776ab533cb50362d32dfccd5d556995bedd50bfbd34a817e65217d1cf\nagent.id,caaf3b95-7314-497c-8100-a13848468ee8\ndestination.ip,10.227.128.134\nevent.category,behavior\nevent.dataset,endpoint.diagnostic.collection\nevent.module,endpoint\nfile.name,fake_behavior.exe\nfile.path,C:/fake_behavior.exe\nhost.name,d25f9128-820e-4998-a26d-0c62507541b4\nhost.os.name,Linux\nhost.os.version,10.12\nkibana.alert.original_time,2025-04-23T10:01:46.423Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,high\nprocess.code_signature.status,trusted\nprocess.code_signature.subject_name,Microsoft Windows\nprocess.executable,C:/fake_behavior/powershell.exe\nprocess.name,powershell.exe\nprocess.pid,2\nsource.ip,10.165.5.78\nuser.domain,levs2xh93i\nuser.name,905a6fce-581f-4dc5-ae4a-80d2a3a9cd8a',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-23T06:10:57.329Z\n_id,5fc5f124671b3f3088af216dcecd21fafc8021d09ea7bb70ed50d3de94040a14\nagent.id,caaf3b95-7314-497c-8100-a13848468ee8\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nfile.hash.sha256,fake file sha256\nfile.name,fake_malware.exe\nfile.path,C:/fake_malware.exe\nhost.name,d25f9128-820e-4998-a26d-0c62507541b4\nhost.os.name,Linux\nhost.os.version,10.12\nkibana.alert.original_time,2025-04-23T09:08:04.423Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,system\nprocess.executable,C:/malware.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,malware writer\nprocess.pid,2\nuser.domain,j73wh73k7i\nuser.name,1c1fbea6-bbf8-4d64-a32d-190b5b91a7c8',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-23T06:10:57.328Z\n_id,3c8f95424a0ec986f7b1621481c6259d30335a9b288e622797075a73eec94cb0\nagent.id,caaf3b95-7314-497c-8100-a13848468ee8\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nhost.name,d25f9128-820e-4998-a26d-0c62507541b4\nhost.os.name,Linux\nhost.os.version,10.12\nkibana.alert.original_time,2025-04-23T09:00:52.423Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,high\nprocess.executable,C:/fake/mimikatz.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,mimikatz.exe\nprocess.pid,2\nuser.domain,pwn614fwgb\nuser.name,9bdca919-4ebf-419d-b6e8-d8b44a49daf9',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-23T06:10:57.326Z\n_id,27dab2e163455af4b040c98bd65916969a6f4e1c8dbf50f6880673c5c765f62d\nagent.id,caaf3b95-7314-497c-8100-a13848468ee8\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nfile.hash.sha256,fake file sha256\nfile.name,fake_malware.exe\nfile.path,C:/fake_malware.exe\nhost.name,d25f9128-820e-4998-a26d-0c62507541b4\nhost.os.name,Linux\nhost.os.version,10.12\nkibana.alert.original_time,2025-04-23T08:48:33.423Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,system\nprocess.executable,C:/malware.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,malware writer\nprocess.pid,2\nuser.domain,nh1pp6oqry\nuser.name,66617ac5-ae65-411e-85af-2f23641033a7',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-23T06:10:57.324Z\n_id,04dcc5faeab7091560c83b50a8ef98f36241a4f8a6035912ac28db1447001b79\nagent.id,caaf3b95-7314-497c-8100-a13848468ee8\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nhost.name,d25f9128-820e-4998-a26d-0c62507541b4\nhost.os.name,Linux\nhost.os.version,10.12\nkibana.alert.original_time,2025-04-23T08:12:17.423Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,high\nprocess.executable,C:/fake/lsass.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,lsass.exe\nprocess.pid,2\nuser.domain,rn5hf8gstf\nuser.name,b53edb8b-ff02-4b8d-820a-0cd9e0a42ec8',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-23T06:10:57.323Z\n_id,49be8b9b46c1fca7477efc0142244b8645833c9d8a57c373c893ebda61fd957d\nagent.id,caaf3b95-7314-497c-8100-a13848468ee8\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nfile.hash.sha256,fake file sha256\nfile.name,fake_malware.exe\nfile.path,C:/fake_malware.exe\nhost.name,d25f9128-820e-4998-a26d-0c62507541b4\nhost.os.name,Linux\nhost.os.version,10.12\nkibana.alert.original_time,2025-04-23T07:39:05.423Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,system\nprocess.executable,C:/malware.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,malware writer\nprocess.pid,2\nuser.domain,hgnwhoszak\nuser.name,0e936e8d-054b-473c-92f0-edfad248e727',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-23T06:10:57.322Z\n_id,36937b55716b9fcd7f0c444f0e104344cb79a450224b3d8bbeaa71b08462b2d5\nagent.id,caaf3b95-7314-497c-8100-a13848468ee8\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nhost.name,d25f9128-820e-4998-a26d-0c62507541b4\nhost.os.name,Linux\nhost.os.version,10.12\nkibana.alert.original_time,2025-04-23T07:22:59.423Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,high\nprocess.executable,C:/fake/powershell.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,powershell.exe\nprocess.pid,2\nuser.domain,6pgl3qjaek\nuser.name,25ecb7b0-3a2f-4d93-923e-1f740151859c',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-23T06:10:57.321Z\n_id,b95da0cffa5eaaa5f9f7d881507cb483d99a5cb58ad2b3e577864db2da8925f2\nagent.id,caaf3b95-7314-497c-8100-a13848468ee8\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nhost.name,d25f9128-820e-4998-a26d-0c62507541b4\nhost.os.name,Linux\nhost.os.version,10.12\nkibana.alert.original_time,2025-04-23T07:07:08.423Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,high\nprocess.executable,C:/fake/explorer.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,explorer.exe\nprocess.pid,2\nuser.domain,0equ0j19g9\nuser.name,7de4b044-34f0-4e58-a35a-08dca8be8e63',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-23T06:10:57.319Z\n_id,f1ce48bdc87632f2706466f57e78f3fb3db32de97280de339e1d2f9dd7d5eb22\nagent.id,caaf3b95-7314-497c-8100-a13848468ee8\ndestination.ip,10.246.31.27\nevent.category,behavior\nevent.dataset,endpoint.diagnostic.collection\nevent.module,endpoint\nfile.name,fake_behavior.exe\nfile.path,C:/fake_behavior.exe\nhost.name,d25f9128-820e-4998-a26d-0c62507541b4\nhost.os.name,Linux\nhost.os.version,10.12\nkibana.alert.original_time,2025-04-23T06:53:37.423Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,high\nprocess.code_signature.status,trusted\nprocess.code_signature.subject_name,Microsoft Windows\nprocess.executable,C:/fake_behavior/notepad.exe\nprocess.name,notepad.exe\nprocess.pid,2\nsource.ip,10.110.157.207\nuser.domain,rnm07o8wqh\nuser.name,a88a40cc-f3d9-41aa-b931-5f32e13e3214',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-23T06:10:57.315Z\n_id,0bfb465a31735e41caf5a200c9fb8bfd9d0e9ec91d4ddc55379bbf141782c07a\nagent.id,caaf3b95-7314-497c-8100-a13848468ee8\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nfile.hash.sha256,fake file sha256\nfile.name,fake_malware.exe\nfile.path,C:/fake_malware.exe\nhost.name,d25f9128-820e-4998-a26d-0c62507541b4\nhost.os.name,Linux\nhost.os.version,10.12\nkibana.alert.original_time,2025-04-23T06:10:38.423Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,system\nprocess.executable,C:/malware.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,malware writer\nprocess.pid,2\nuser.domain,tngs9s0401\nuser.name,790155dd-c99a-4241-b497-433e36f0d8b5',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-21T21:07:32.012Z\n_id,7dc9f8ff9f220685b0af680ad98d8dfd96ddaf749998600df6c18acbbc84a700\nagent.id,caaf3b95-7314-497c-8100-a13848468ee8\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nhost.name,d25f9128-820e-4998-a26d-0c62507541b4\nhost.os.name,Linux\nhost.os.version,10.12\nkibana.alert.original_time,2025-04-26T01:43:10.313Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,high\nprocess.executable,C:/fake/lsass.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,lsass.exe\nprocess.pid,2\nuser.domain,326lwhiqeg\nuser.name,c8db5601-e6fd-44b4-b645-21855715ce0a',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-21T21:07:32.011Z\n_id,7b52c0c4d1116d3c25109b98eb078b2acd320e458a28a64cea4f106ed3ac265a\nagent.id,caaf3b95-7314-497c-8100-a13848468ee8\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nhost.name,d25f9128-820e-4998-a26d-0c62507541b4\nhost.os.name,Linux\nhost.os.version,10.12\nkibana.alert.original_time,2025-04-24T21:46:01.313Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,high\nprocess.executable,C:/fake/lsass.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,lsass.exe\nprocess.pid,2\nuser.domain,6yedwajn9r\nuser.name,96908c11-7d55-48fe-a0dc-2a6de3b4736a',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-21T21:07:32.010Z\n_id,b6190597d82b333b5429c28c2f21e03f75560a584a53ae5a9816dd06b3fcb86f\nagent.id,caaf3b95-7314-497c-8100-a13848468ee8\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nhost.name,d25f9128-820e-4998-a26d-0c62507541b4\nhost.os.name,Linux\nhost.os.version,10.12\nkibana.alert.original_time,2025-04-22T03:51:08.313Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,high\nprocess.executable,C:/fake/iexlorer.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,iexlorer.exe\nprocess.pid,2\nuser.domain,uvae2bp3di\nuser.name,e3a53869-c1be-459f-bf07-26ad89afc110',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-21T21:07:32.010Z\n_id,6633e460477846d193d8a1ae3162ec9dfc744d9d33debaf866e5c964cb2334ad\nagent.id,caaf3b95-7314-497c-8100-a13848468ee8\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nhost.name,d25f9128-820e-4998-a26d-0c62507541b4\nhost.os.name,Linux\nhost.os.version,10.12\nkibana.alert.original_time,2025-04-22T09:23:38.313Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,high\nprocess.executable,C:/fake/notepad.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,notepad.exe\nprocess.pid,2\nuser.domain,s6t47lzoo0\nuser.name,256b6a76-729e-42de-abb1-1b1583f1b0ba',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-21T21:07:32.008Z\n_id,6ec6180501138d849e7a5838d9cd4baf01e0631989a9cba2081b91957cd97214\nagent.id,caaf3b95-7314-497c-8100-a13848468ee8\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nfile.hash.sha256,fake file sha256\nfile.name,fake_malware.exe\nfile.path,C:/fake_malware.exe\nhost.name,d25f9128-820e-4998-a26d-0c62507541b4\nhost.os.name,Linux\nhost.os.version,10.12\nkibana.alert.original_time,2025-04-22T02:21:17.313Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,system\nprocess.executable,C:/malware.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,malware writer\nprocess.pid,2\nuser.domain,ffozn2oulm\nuser.name,d90db9ba-e964-4cf2-a88d-0f1b0fbffea1',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-21T21:07:32.007Z\n_id,cd01c83a7f1225309421b2b72f0ec27d08bb37bf4f00ad346ca120c0bc43fa9a\nagent.id,caaf3b95-7314-497c-8100-a13848468ee8\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nfile.hash.sha256,fake file sha256\nfile.name,fake_malware.exe\nfile.path,C:/fake_malware.exe\nhost.name,d25f9128-820e-4998-a26d-0c62507541b4\nhost.os.name,Linux\nhost.os.version,10.12\nkibana.alert.original_time,2025-04-22T01:04:30.313Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,system\nprocess.executable,C:/malware.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,malware writer\nprocess.pid,2\nuser.domain,q6g9jm2hmj\nuser.name,1b326a75-a58c-4be5-bc1a-099cd1058622',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-21T21:07:32.006Z\n_id,1c2e28cfe7e27cf1291a71b933c4d9fcc51e6fb720600f5f8d736f70eedf320c\nagent.id,caaf3b95-7314-497c-8100-a13848468ee8\ndestination.ip,10.227.128.134\nevent.category,behavior\nevent.dataset,endpoint.diagnostic.collection\nevent.module,endpoint\nfile.name,fake_behavior.exe\nfile.path,C:/fake_behavior.exe\nhost.name,d25f9128-820e-4998-a26d-0c62507541b4\nhost.os.name,Linux\nhost.os.version,10.12\nkibana.alert.original_time,2025-04-22T00:58:43.313Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,high\nprocess.code_signature.status,trusted\nprocess.code_signature.subject_name,Microsoft Windows\nprocess.executable,C:/fake_behavior/powershell.exe\nprocess.name,powershell.exe\nprocess.pid,2\nsource.ip,10.165.5.78\nuser.domain,levs2xh93i\nuser.name,905a6fce-581f-4dc5-ae4a-80d2a3a9cd8a',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-21T21:07:32.004Z\n_id,f5d06dc221a00850b28f89705495c483f4404896d80e22f353155ceb9a981ca8\nagent.id,caaf3b95-7314-497c-8100-a13848468ee8\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nfile.hash.sha256,fake file sha256\nfile.name,fake_malware.exe\nfile.path,C:/fake_malware.exe\nhost.name,d25f9128-820e-4998-a26d-0c62507541b4\nhost.os.name,Linux\nhost.os.version,10.12\nkibana.alert.original_time,2025-04-22T00:05:01.313Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,system\nprocess.executable,C:/malware.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,malware writer\nprocess.pid,2\nuser.domain,j73wh73k7i\nuser.name,1c1fbea6-bbf8-4d64-a32d-190b5b91a7c8',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-21T21:07:32.003Z\n_id,aff833708dcf8683a4c097c9d39122b3e631b6dc67cc434ae536b323464dc896\nagent.id,caaf3b95-7314-497c-8100-a13848468ee8\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nhost.name,d25f9128-820e-4998-a26d-0c62507541b4\nhost.os.name,Linux\nhost.os.version,10.12\nkibana.alert.original_time,2025-04-21T23:57:49.313Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,high\nprocess.executable,C:/fake/mimikatz.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,mimikatz.exe\nprocess.pid,2\nuser.domain,pwn614fwgb\nuser.name,9bdca919-4ebf-419d-b6e8-d8b44a49daf9',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-21T21:07:32.001Z\n_id,16788a6dade98ee7ddb57c645a682cfb0e7cc84fcce8ea0b2b31a57a0b6f0b1c\nagent.id,caaf3b95-7314-497c-8100-a13848468ee8\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nfile.hash.sha256,fake file sha256\nfile.name,fake_malware.exe\nfile.path,C:/fake_malware.exe\nhost.name,d25f9128-820e-4998-a26d-0c62507541b4\nhost.os.name,Linux\nhost.os.version,10.12\nkibana.alert.original_time,2025-04-21T23:45:30.313Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,system\nprocess.executable,C:/malware.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,malware writer\nprocess.pid,2\nuser.domain,nh1pp6oqry\nuser.name,66617ac5-ae65-411e-85af-2f23641033a7',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-21T21:07:31.997Z\n_id,537474e1556fd74aee77d0ed07bab8ba6100e2c0f1b802438fab4cb6f68fc35f\nagent.id,caaf3b95-7314-497c-8100-a13848468ee8\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nhost.name,d25f9128-820e-4998-a26d-0c62507541b4\nhost.os.name,Linux\nhost.os.version,10.12\nkibana.alert.original_time,2025-04-21T23:09:14.313Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,high\nprocess.executable,C:/fake/lsass.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,lsass.exe\nprocess.pid,2\nuser.domain,rn5hf8gstf\nuser.name,b53edb8b-ff02-4b8d-820a-0cd9e0a42ec8',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-21T21:07:31.995Z\n_id,61ce316f5316a83a4e221d2d70a8470503ef996f101a62bce6e09aa8cd1e0455\nagent.id,caaf3b95-7314-497c-8100-a13848468ee8\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nfile.hash.sha256,fake file sha256\nfile.name,fake_malware.exe\nfile.path,C:/fake_malware.exe\nhost.name,d25f9128-820e-4998-a26d-0c62507541b4\nhost.os.name,Linux\nhost.os.version,10.12\nkibana.alert.original_time,2025-04-21T22:36:02.313Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,system\nprocess.executable,C:/malware.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,malware writer\nprocess.pid,2\nuser.domain,hgnwhoszak\nuser.name,0e936e8d-054b-473c-92f0-edfad248e727',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-21T21:07:31.994Z\n_id,1f7c734d31f7e269facc6800ec7f20ecc5d5feec343e16a6ba515aea79a5d8ab\nagent.id,caaf3b95-7314-497c-8100-a13848468ee8\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nhost.name,d25f9128-820e-4998-a26d-0c62507541b4\nhost.os.name,Linux\nhost.os.version,10.12\nkibana.alert.original_time,2025-04-21T22:19:56.313Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,high\nprocess.executable,C:/fake/powershell.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,powershell.exe\nprocess.pid,2\nuser.domain,6pgl3qjaek\nuser.name,25ecb7b0-3a2f-4d93-923e-1f740151859c',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-21T21:07:31.992Z\n_id,5f062b7ea32ef0ed4f83a44dd58768641db95b741c5ca71b44b126e7b200a25a\nagent.id,caaf3b95-7314-497c-8100-a13848468ee8\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nhost.name,d25f9128-820e-4998-a26d-0c62507541b4\nhost.os.name,Linux\nhost.os.version,10.12\nkibana.alert.original_time,2025-04-21T22:04:05.313Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,high\nprocess.executable,C:/fake/explorer.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,explorer.exe\nprocess.pid,2\nuser.domain,0equ0j19g9\nuser.name,7de4b044-34f0-4e58-a35a-08dca8be8e63',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-21T21:07:31.991Z\n_id,b30b887d7b06b7f570c86a7891a16ee1e9a9186baf5ba7776c4cf59cfb9e498e\nagent.id,caaf3b95-7314-497c-8100-a13848468ee8\ndestination.ip,10.246.31.27\nevent.category,behavior\nevent.dataset,endpoint.diagnostic.collection\nevent.module,endpoint\nfile.name,fake_behavior.exe\nfile.path,C:/fake_behavior.exe\nhost.name,d25f9128-820e-4998-a26d-0c62507541b4\nhost.os.name,Linux\nhost.os.version,10.12\nkibana.alert.original_time,2025-04-21T21:50:34.313Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,high\nprocess.code_signature.status,trusted\nprocess.code_signature.subject_name,Microsoft Windows\nprocess.executable,C:/fake_behavior/notepad.exe\nprocess.name,notepad.exe\nprocess.pid,2\nsource.ip,10.110.157.207\nuser.domain,rnm07o8wqh\nuser.name,a88a40cc-f3d9-41aa-b931-5f32e13e3214',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-21T21:07:31.988Z\n_id,c9bf570db3b4b29719411926b227417d4a1350219e3529796e8180d66ba5a3b1\nagent.id,caaf3b95-7314-497c-8100-a13848468ee8\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nfile.hash.sha256,fake file sha256\nfile.name,fake_malware.exe\nfile.path,C:/fake_malware.exe\nhost.name,d25f9128-820e-4998-a26d-0c62507541b4\nhost.os.name,Linux\nhost.os.version,10.12\nkibana.alert.original_time,2025-04-21T21:07:35.313Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,system\nprocess.executable,C:/malware.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,malware writer\nprocess.pid,2\nuser.domain,tngs9s0401\nuser.name,790155dd-c99a-4241-b497-433e36f0d8b5',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-21T17:00:32.099Z\n_id,7796a78c19a9fb69af42c210146f0cb0e3d8e1fc0d62d18f193d83849193fd3e\nagent.id,59af2e1a-095b-4cb6-9167-0f989f7c5b9d\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nhost.name,ba933963-be1f-4d58-b1ff-1a3baff87ef8\nhost.os.name,macOS\nhost.os.version,12.6.1\nkibana.alert.original_time,2025-05-01T22:20:08.651Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,high\nprocess.executable,C:/fake/lsass.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,lsass.exe\nprocess.pid,2\nuser.domain,zj54ebnoyj\nuser.name,a792fad8-dd2a-4627-87ac-9fc7de04471d',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-21T17:00:32.098Z\n_id,289010b8d3bba8afe4067033b025b9dbc54ccf9da0e78542d2dc876e5d724296\nagent.id,59af2e1a-095b-4cb6-9167-0f989f7c5b9d\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nhost.name,ba933963-be1f-4d58-b1ff-1a3baff87ef8\nhost.os.name,macOS\nhost.os.version,12.6.1\nkibana.alert.original_time,2025-05-01T10:46:06.651Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,high\nprocess.executable,C:/fake/mimikatz.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,mimikatz.exe\nprocess.pid,2\nuser.domain,lzghdxpcuv\nuser.name,7a3be8c8-fd40-40cd-8889-1306911e5c1e',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-21T17:00:32.097Z\n_id,6edc81d2f62c1716a5e07509b283e3ef863cf7faddf4674c0a7bbf9ae8b65401\nagent.id,59af2e1a-095b-4cb6-9167-0f989f7c5b9d\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nhost.name,ba933963-be1f-4d58-b1ff-1a3baff87ef8\nhost.os.name,macOS\nhost.os.version,12.6.1\nkibana.alert.original_time,2025-04-30T10:46:23.651Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,high\nprocess.executable,C:/fake/explorer.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,explorer.exe\nprocess.pid,2\nuser.domain,69ssexzvqs\nuser.name,d238fbd8-fda3-4b7d-b849-3f792e7f5ddc',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-21T17:00:32.096Z\n_id,bb305d416adfe5ab23a923371009d8fd9f5acf20d778ba4111b00c2d03b91bba\nagent.id,59af2e1a-095b-4cb6-9167-0f989f7c5b9d\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nhost.name,ba933963-be1f-4d58-b1ff-1a3baff87ef8\nhost.os.name,macOS\nhost.os.version,12.6.1\nkibana.alert.original_time,2025-04-28T01:06:37.651Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,high\nprocess.executable,C:/fake/powershell.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,powershell.exe\nprocess.pid,2\nuser.domain,3kz7vv0xqy\nuser.name,82d518af-728f-44b3-9bf4-9155c119c663',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-21T17:00:32.095Z\n_id,f3c47435766e944288478a807e0924aeda9e06205798a184c55cf455356cab24\nagent.id,59af2e1a-095b-4cb6-9167-0f989f7c5b9d\ndestination.ip,10.225.191.177\nevent.category,behavior\nevent.dataset,endpoint.diagnostic.collection\nevent.module,endpoint\nfile.name,fake_behavior.exe\nfile.path,C:/fake_behavior.exe\nhost.name,ba933963-be1f-4d58-b1ff-1a3baff87ef8\nhost.os.name,macOS\nhost.os.version,12.6.1\nkibana.alert.original_time,2025-04-27T18:27:25.651Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,high\nprocess.code_signature.status,trusted\nprocess.code_signature.subject_name,Microsoft Windows\nprocess.executable,C:/fake_behavior/lsass.exe\nprocess.name,lsass.exe\nprocess.pid,2\nsource.ip,10.56.10.148\nuser.domain,ltg1iwt0x8\nuser.name,52bb5279-e2f3-4038-b0f6-dea8d2fa8cfc',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-21T17:00:32.094Z\n_id,99bf6115640aa5aeb9b4b0677189b11d88a67435ae9e69660e8060f3ae29030b\nagent.id,59af2e1a-095b-4cb6-9167-0f989f7c5b9d\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nhost.name,ba933963-be1f-4d58-b1ff-1a3baff87ef8\nhost.os.name,macOS\nhost.os.version,12.6.1\nkibana.alert.original_time,2025-04-27T16:10:16.651Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,high\nprocess.executable,C:/fake/explorer.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,explorer.exe\nprocess.pid,2\nuser.domain,11ueu6seb0\nuser.name,8dfd9a11-b27a-4af8-b89c-b61821466a2a',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-21T17:00:32.093Z\n_id,ba5f45e8b9ff1b93113351c8d30d942cf7e07316573cb4998df5406ddafe53ce\nagent.id,59af2e1a-095b-4cb6-9167-0f989f7c5b9d\ndestination.ip,10.174.76.173\nevent.category,behavior\nevent.dataset,endpoint.diagnostic.collection\nevent.module,endpoint\nfile.name,fake_behavior.exe\nfile.path,C:/fake_behavior.exe\nhost.name,ba933963-be1f-4d58-b1ff-1a3baff87ef8\nhost.os.name,macOS\nhost.os.version,12.6.1\nkibana.alert.original_time,2025-04-27T15:44:17.651Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,high\nprocess.code_signature.status,trusted\nprocess.code_signature.subject_name,Microsoft Windows\nprocess.executable,C:/fake_behavior/notepad.exe\nprocess.name,notepad.exe\nprocess.pid,2\nsource.ip,10.186.165.114\nuser.domain,x0n46z9am5\nuser.name,9bcecb74-e2c2-42a3-b386-d10769cbf2cc',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-21T17:00:32.092Z\n_id,6db5ff7fbcf6229a7569a1a9b060f79e81ec4322025b05da7e161814f10aab1e\nagent.id,59af2e1a-095b-4cb6-9167-0f989f7c5b9d\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nfile.hash.sha256,fake file sha256\nfile.name,fake_malware.exe\nfile.path,C:/fake_malware.exe\nhost.name,ba933963-be1f-4d58-b1ff-1a3baff87ef8\nhost.os.name,macOS\nhost.os.version,12.6.1\nkibana.alert.original_time,2025-04-27T14:01:30.651Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,system\nprocess.executable,C:/malware.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,malware writer\nprocess.pid,2\nuser.domain,ilfcwy0jy4\nuser.name,fbbc0e7b-c391-44dd-b325-10f24f3180b2',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-21T17:00:32.091Z\n_id,f53996ffaf772c0239eea78bf84553dec201260d673a60944420187544d5dad3\nagent.id,59af2e1a-095b-4cb6-9167-0f989f7c5b9d\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nhost.name,ba933963-be1f-4d58-b1ff-1a3baff87ef8\nhost.os.name,macOS\nhost.os.version,12.6.1\nkibana.alert.original_time,2025-04-24T15:25:06.651Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,high\nprocess.executable,C:/fake/mimikatz.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,mimikatz.exe\nprocess.pid,2\nuser.domain,ltpekvuk77\nuser.name,6cdbbe3e-f437-4160-a557-b8817406e2cb',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-21T17:00:32.089Z\n_id,a482c14498197c71f319e3a843ec4f9e7f4155b52b8b30e9b43a65a86ae609da\nagent.id,59af2e1a-095b-4cb6-9167-0f989f7c5b9d\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nfile.hash.sha256,fake file sha256\nfile.name,fake_malware.exe\nfile.path,C:/fake_malware.exe\nhost.name,ba933963-be1f-4d58-b1ff-1a3baff87ef8\nhost.os.name,macOS\nhost.os.version,12.6.1\nkibana.alert.original_time,2025-04-23T20:30:06.651Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,system\nprocess.executable,C:/malware.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,malware writer\nprocess.pid,2\nuser.domain,kz0c8xj11r\nuser.name,8da6ff34-4ca4-49fe-84c1-39dd76269255',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-21T17:00:32.088Z\n_id,c4d1a50454ff08e345563bfeb207d7fdc29a04b574e5494a888ee3b575b5ae1a\nagent.id,59af2e1a-095b-4cb6-9167-0f989f7c5b9d\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nfile.hash.sha256,fake file sha256\nfile.name,fake_malware.exe\nfile.path,C:/fake_malware.exe\nhost.name,ba933963-be1f-4d58-b1ff-1a3baff87ef8\nhost.os.name,macOS\nhost.os.version,12.6.1\nkibana.alert.original_time,2025-04-23T13:38:27.651Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,system\nprocess.executable,C:/malware.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,malware writer\nprocess.pid,2\nuser.domain,k5s82ra4p9\nuser.name,25aed668-b51c-428f-8ed7-cb7076074927',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-21T17:00:32.087Z\n_id,f3d3e63ddd1097354a5f85f7677cc5731ecad630dd6b601c4ed338afaa4ce7cd\nagent.id,59af2e1a-095b-4cb6-9167-0f989f7c5b9d\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nhost.name,ba933963-be1f-4d58-b1ff-1a3baff87ef8\nhost.os.name,macOS\nhost.os.version,12.6.1\nkibana.alert.original_time,2025-04-23T10:11:20.651Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,high\nprocess.executable,C:/fake/lsass.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,lsass.exe\nprocess.pid,2\nuser.domain,y2fipbnbcs\nuser.name,2c92dc4a-ff8c-49e8-837e-118fa7ba5f2f',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-21T17:00:32.087Z\n_id,5d5a4f48b1eeb93a73ae06e50c3133910ad83dc6bcb37346225dfdca0d594c37\nagent.id,59af2e1a-095b-4cb6-9167-0f989f7c5b9d\ndestination.ip,10.230.219.230\nevent.category,behavior\nevent.dataset,endpoint.diagnostic.collection\nevent.module,endpoint\nfile.name,fake_behavior.exe\nfile.path,C:/fake_behavior.exe\nhost.name,ba933963-be1f-4d58-b1ff-1a3baff87ef8\nhost.os.name,macOS\nhost.os.version,12.6.1\nkibana.alert.original_time,2025-04-22T19:22:35.651Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,high\nprocess.code_signature.status,trusted\nprocess.code_signature.subject_name,Microsoft Windows\nprocess.executable,C:/fake_behavior/explorer.exe\nprocess.name,explorer.exe\nprocess.pid,2\nsource.ip,10.237.220.100\nuser.domain,q3p216qvyk\nuser.name,c2e9cd59-e481-4c3c-a8a9-bafdd5982826',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-21T17:00:32.086Z\n_id,75c66ed3e739b4e6e75f78d8eec8eaa793572a647f38e85c568aa53016b7dcc2\nagent.id,59af2e1a-095b-4cb6-9167-0f989f7c5b9d\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nfile.hash.sha256,fake file sha256\nfile.name,fake_malware.exe\nfile.path,C:/fake_malware.exe\nhost.name,ba933963-be1f-4d58-b1ff-1a3baff87ef8\nhost.os.name,macOS\nhost.os.version,12.6.1\nkibana.alert.original_time,2025-04-22T05:38:55.651Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,system\nprocess.executable,C:/malware.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,malware writer\nprocess.pid,2\nuser.domain,fyweudx4ln\nuser.name,68333292-b812-44de-b479-18a5b170925f',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-21T17:00:32.085Z\n_id,1aff0e2673adad409f2f9904008d231fc60c5867cfb3c98a07ca2b5c34b73635\nagent.id,59af2e1a-095b-4cb6-9167-0f989f7c5b9d\ndestination.ip,10.62.70.34\nevent.category,behavior\nevent.dataset,endpoint.diagnostic.collection\nevent.module,endpoint\nfile.name,fake_behavior.exe\nfile.path,C:/fake_behavior.exe\nhost.name,ba933963-be1f-4d58-b1ff-1a3baff87ef8\nhost.os.name,macOS\nhost.os.version,12.6.1\nkibana.alert.original_time,2025-04-21T21:15:51.651Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,high\nprocess.code_signature.status,trusted\nprocess.code_signature.subject_name,Microsoft Windows\nprocess.executable,C:/fake_behavior/lsass.exe\nprocess.name,lsass.exe\nprocess.pid,2\nsource.ip,10.86.116.72\nuser.domain,cpyq5md0rg\nuser.name,46a697fe-1606-42d4-a6c0-b9e2c89f624f',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-21T17:00:32.081Z\n_id,5582b1708a833daba3be23d2226b1a84e388583497d6ef7431664e97ef691528\nagent.id,59af2e1a-095b-4cb6-9167-0f989f7c5b9d\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nhost.name,ba933963-be1f-4d58-b1ff-1a3baff87ef8\nhost.os.name,macOS\nhost.os.version,12.6.1\nkibana.alert.original_time,2025-04-21T20:55:42.651Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,high\nprocess.executable,C:/fake/powershell.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,powershell.exe\nprocess.pid,2\nuser.domain,ukfm9a4ooj\nuser.name,a00479ef-9240-422f-a1de-06de25cc9cfe',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-21T17:00:32.080Z\n_id,bfcf0b5311172f7f87d3a36b9ceaac5e1fc4200ad9aabb5ba1b0480f42dc4e57\nagent.id,59af2e1a-095b-4cb6-9167-0f989f7c5b9d\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nhost.name,ba933963-be1f-4d58-b1ff-1a3baff87ef8\nhost.os.name,macOS\nhost.os.version,12.6.1\nkibana.alert.original_time,2025-04-21T20:33:35.651Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,high\nprocess.executable,C:/fake/mimikatz.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,mimikatz.exe\nprocess.pid,2\nuser.domain,hizhwsfk4p\nuser.name,37ad0f7f-fecf-45ae-b35b-f61a911ee38d',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-21T17:00:32.078Z\n_id,ad98fc453900826573ddca5eb19dab465be188f3a02c984c5cdda3b1ccec1d9c\nagent.id,59af2e1a-095b-4cb6-9167-0f989f7c5b9d\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nhost.name,ba933963-be1f-4d58-b1ff-1a3baff87ef8\nhost.os.name,macOS\nhost.os.version,12.6.1\nkibana.alert.original_time,2025-04-21T20:13:30.651Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,high\nprocess.executable,C:/fake/powershell.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,powershell.exe\nprocess.pid,2\nuser.domain,h54oasjcw2\nuser.name,193565aa-2523-4da6-9df4-5f7225e0dc31',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-21T17:00:32.077Z\n_id,3b3a1d4633306591fdf3c9dcaa03a24f7ba9e1e63596a401ff0301beddbaeb07\nagent.id,59af2e1a-095b-4cb6-9167-0f989f7c5b9d\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nfile.hash.sha256,fake file sha256\nfile.name,fake_malware.exe\nfile.path,C:/fake_malware.exe\nhost.name,ba933963-be1f-4d58-b1ff-1a3baff87ef8\nhost.os.name,macOS\nhost.os.version,12.6.1\nkibana.alert.original_time,2025-04-21T19:47:06.651Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,system\nprocess.executable,C:/malware.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,malware writer\nprocess.pid,2\nuser.domain,gqbrxs3aqb\nuser.name,126fb618-7855-41ca-a079-ef1fb096ad4e',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-21T17:00:32.075Z\n_id,cbe63218d18c19f5a48ab0c95ee9018546783a05ccda1c2a58b39754a63d1f53\nagent.id,59af2e1a-095b-4cb6-9167-0f989f7c5b9d\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nfile.hash.sha256,fake file sha256\nfile.name,fake_malware.exe\nfile.path,C:/fake_malware.exe\nhost.name,ba933963-be1f-4d58-b1ff-1a3baff87ef8\nhost.os.name,macOS\nhost.os.version,12.6.1\nkibana.alert.original_time,2025-04-21T19:31:16.651Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,system\nprocess.executable,C:/malware.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,malware writer\nprocess.pid,2\nuser.domain,j025k9x0eo\nuser.name,8bc4314b-331a-458c-b167-bf355559e640',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-21T17:00:32.074Z\n_id,13a75fe5d870f7bc47df2b1051dce08f13a2778fcbe5415ecf080a86d2f10190\nagent.id,59af2e1a-095b-4cb6-9167-0f989f7c5b9d\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nhost.name,ba933963-be1f-4d58-b1ff-1a3baff87ef8\nhost.os.name,macOS\nhost.os.version,12.6.1\nkibana.alert.original_time,2025-04-21T19:20:46.651Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,high\nprocess.executable,C:/fake/explorer.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,explorer.exe\nprocess.pid,2\nuser.domain,1dqz1rkull\nuser.name,59b435b6-8627-4b28-8010-e0702955f6fc',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-21T17:00:32.073Z\n_id,d6dc50546909bd9265d67089c527dc34518409f1ff458732a57d945f622f0bb1\nagent.id,59af2e1a-095b-4cb6-9167-0f989f7c5b9d\ndestination.ip,10.54.98.80\nevent.category,behavior\nevent.dataset,endpoint.diagnostic.collection\nevent.module,endpoint\nfile.name,fake_behavior.exe\nfile.path,C:/fake_behavior.exe\nhost.name,ba933963-be1f-4d58-b1ff-1a3baff87ef8\nhost.os.name,macOS\nhost.os.version,12.6.1\nkibana.alert.original_time,2025-04-21T18:11:08.651Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,high\nprocess.code_signature.status,trusted\nprocess.code_signature.subject_name,Microsoft Windows\nprocess.executable,C:/fake_behavior/notepad.exe\nprocess.name,notepad.exe\nprocess.pid,2\nsource.ip,10.217.217.199\nuser.domain,mdbs6ohcw4\nuser.name,d0c4fab3-df09-4564-b8ac-fadfcf35c4bf',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-21T17:00:32.071Z\n_id,1586c695d467889246ffc5e6ddfe3b46f52d6a4a0c0e453f25df2730a93dfc54\nagent.id,59af2e1a-095b-4cb6-9167-0f989f7c5b9d\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nfile.hash.sha256,fake file sha256\nfile.name,fake_malware.exe\nfile.path,C:/fake_malware.exe\nhost.name,ba933963-be1f-4d58-b1ff-1a3baff87ef8\nhost.os.name,macOS\nhost.os.version,12.6.1\nkibana.alert.original_time,2025-04-21T17:36:19.651Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,system\nprocess.executable,C:/malware.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,malware writer\nprocess.pid,2\nuser.domain,d2iva941c9\nuser.name,04293bbf-1bba-47d3-9abf-e3e3e24e24f9',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-21T17:00:32.069Z\n_id,25e95160ade107aa1746594636995c4897a41fe4fab6d7f29a0a3e4caa2a63e4\nagent.id,59af2e1a-095b-4cb6-9167-0f989f7c5b9d\ndestination.ip,10.120.137.144\nevent.category,behavior\nevent.dataset,endpoint.diagnostic.collection\nevent.module,endpoint\nfile.name,fake_behavior.exe\nfile.path,C:/fake_behavior.exe\nhost.name,ba933963-be1f-4d58-b1ff-1a3baff87ef8\nhost.os.name,macOS\nhost.os.version,12.6.1\nkibana.alert.original_time,2025-04-21T17:07:20.651Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,high\nprocess.code_signature.status,trusted\nprocess.code_signature.subject_name,Microsoft Windows\nprocess.executable,C:/fake_behavior/iexlorer.exe\nprocess.name,iexlorer.exe\nprocess.pid,2\nsource.ip,10.4.228.9\nuser.domain,rh7bmovwfr\nuser.name,ec771845-f7df-4f1d-8ef4-30ea6991308b',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-21T17:00:32.068Z\n_id,d43710a39a3590a9ecebc7faecd33d6f04dc4891b5fc38702b3480d8becfd4aa\nagent.id,59af2e1a-095b-4cb6-9167-0f989f7c5b9d\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nhost.name,ba933963-be1f-4d58-b1ff-1a3baff87ef8\nhost.os.name,macOS\nhost.os.version,12.6.1\nkibana.alert.original_time,2025-04-21T17:06:26.651Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,high\nprocess.executable,C:/fake/notepad.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,notepad.exe\nprocess.pid,2\nuser.domain,mz1vs5cfoj\nuser.name,589c83ce-2d23-44a4-8e9c-9ce3c9535481',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-21T17:00:32.065Z\n_id,daa409bfa90730dcc25181fc389669b86b2b1ec54c0d210769591bc5f73cdede\nagent.id,59af2e1a-095b-4cb6-9167-0f989f7c5b9d\ndestination.ip,10.137.112.54\nevent.category,behavior\nevent.dataset,endpoint.diagnostic.collection\nevent.module,endpoint\nfile.name,fake_behavior.exe\nfile.path,C:/fake_behavior.exe\nhost.name,ba933963-be1f-4d58-b1ff-1a3baff87ef8\nhost.os.name,macOS\nhost.os.version,12.6.1\nkibana.alert.original_time,2025-04-21T16:59:54.651Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,high\nprocess.code_signature.status,trusted\nprocess.code_signature.subject_name,Microsoft Windows\nprocess.executable,C:/fake_behavior/powershell.exe\nprocess.name,powershell.exe\nprocess.pid,2\nsource.ip,10.67.234.101\nuser.domain,h8b4zaqzj3\nuser.name,e5a6c255-8251-408c-9952-2eb1c746a25a',
      metadata: {},
    },
    {
      pageContent:
        '@timestamp,2025-04-21T16:56:32.164Z\n_id,2fe9c47ac368870c71adcb2092d0a3776fb57900135a73afbc697cd2fa558d9d\nagent.id,30cd4aa3-c908-49b7-befe-a9f6e21c03f5\nevent.category,malware\nevent.dataset,endpoint\nevent.module,endpoint\nhost.name,077c4701-48c5-4cce-adee-cef0dff53350\nhost.os.name,Windows\nhost.os.version,10.0\nkibana.alert.original_time,2025-04-21T16:55:29.520Z\nkibana.alert.risk_score,47\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Defend alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Endpoint Security (Elastic Defend)\nkibana.alert.severity,medium\nkibana.alert.workflow_status,open\nprocess.Ext.token.integrity_level_name,high\nprocess.executable,C:/fake/explorer.exe\nprocess.hash.md5,fake md5\nprocess.hash.sha1,fake sha1\nprocess.hash.sha256,fake sha256\nprocess.name,explorer.exe\nprocess.pid,2\nuser.domain,cn95jk9a10\nuser.name,af5c33f5-ebf0-486c-ba74-8ef9535e5c66',
      metadata: {},
    },
  ],
  apiConfig: {
    connectorId: 'pmeClaudeV37SonnetUsEast1',
    actionTypeId: '.bedrock',
  },
  attackDiscoveries: [
    {
      alertIds: [
        '0bfb465a31735e41caf5a200c9fb8bfd9d0e9ec91d4ddc55379bbf141782c07a',
        '3ba7ccb776ab533cb50362d32dfccd5d556995bedd50bfbd34a817e65217d1cf',
        '5fc5f124671b3f3088af216dcecd21fafc8021d09ea7bb70ed50d3de94040a14',
        '3c8f95424a0ec986f7b1621481c6259d30335a9b288e622797075a73eec94cb0',
        '27dab2e163455af4b040c98bd65916969a6f4e1c8dbf50f6880673c5c765f62d',
        '04dcc5faeab7091560c83b50a8ef98f36241a4f8a6035912ac28db1447001b79',
        '49be8b9b46c1fca7477efc0142244b8645833c9d8a57c373c893ebda61fd957d',
        '36937b55716b9fcd7f0c444f0e104344cb79a450224b3d8bbeaa71b08462b2d5',
        'b95da0cffa5eaaa5f9f7d881507cb483d99a5cb58ad2b3e577864db2da8925f2',
        'f1ce48bdc87632f2706466f57e78f3fb3db32de97280de339e1d2f9dd7d5eb22',
        '0614e695ff78ec8b96e46a96e4f52023e738cd8d4ef710a0eb9bbc05f90f6921',
        '1f48440803875db9869fefdbc613adf3d39532b701c415eab6b715b16c3891da',
        '966029c8fb82a63c5c6aaa274b7e23da87a34d5a6e854d8b6f3f6047126d35ea',
        '696ceb46588c6f0a191a528f57d63a22e8d0565fc856e88ccefb5c72fd60d600',
        'c9bf570db3b4b29719411926b227417d4a1350219e3529796e8180d66ba5a3b1',
        'b30b887d7b06b7f570c86a7891a16ee1e9a9186baf5ba7776c4cf59cfb9e498e',
        '5f062b7ea32ef0ed4f83a44dd58768641db95b741c5ca71b44b126e7b200a25a',
        '1f7c734d31f7e269facc6800ec7f20ecc5d5feec343e16a6ba515aea79a5d8ab',
        '61ce316f5316a83a4e221d2d70a8470503ef996f101a62bce6e09aa8cd1e0455',
        '537474e1556fd74aee77d0ed07bab8ba6100e2c0f1b802438fab4cb6f68fc35f',
        '16788a6dade98ee7ddb57c645a682cfb0e7cc84fcce8ea0b2b31a57a0b6f0b1c',
        'aff833708dcf8683a4c097c9d39122b3e631b6dc67cc434ae536b323464dc896',
        'f5d06dc221a00850b28f89705495c483f4404896d80e22f353155ceb9a981ca8',
        '1c2e28cfe7e27cf1291a71b933c4d9fcc51e6fb720600f5f8d736f70eedf320c',
        'cd01c83a7f1225309421b2b72f0ec27d08bb37bf4f00ad346ca120c0bc43fa9a',
        '6ec6180501138d849e7a5838d9cd4baf01e0631989a9cba2081b91957cd97214',
        '6633e460477846d193d8a1ae3162ec9dfc744d9d33debaf866e5c964cb2334ad',
        'b6190597d82b333b5429c28c2f21e03f75560a584a53ae5a9816dd06b3fcb86f',
      ],
      detailsMarkdown:
        '## Persistent Attack Campaign on Linux Host\n\nA sophisticated persistent attack campaign was identified on {{ host.name d25f9128-820e-4998-a26d-0c62507541b4 }} spanning multiple days:\n\n* **Initial Compromise (April 21, 21:07:35)**: The campaign began with {{ process.name malware writer }} execution with {{ process.Ext.token.integrity_level_name system }} privileges by user {{ user.name 790155dd-c99a-4241-b497-433e36f0d8b5 }}.\n\n* **Network Reconnaissance (April 21, 21:50:34)**: The attacker used {{ process.name notepad.exe }} to establish connections from {{ source.ip 10.110.157.207 }} to {{ destination.ip 10.246.31.27 }} for command and control.\n\n* **Lateral Movement (April 21, 22:04:05)**: {{ process.name explorer.exe }} was executed by user {{ user.name 7de4b044-34f0-4e58-a35a-08dca8be8e63 }} to establish persistence.\n\n* **Command Execution (April 21, 22:19:56)**: {{ process.name powershell.exe }} was executed by user {{ user.name 25ecb7b0-3a2f-4d93-923e-1f740151859c }}.\n\n* **Credential Access (April 21, 23:09:14)**: {{ process.name lsass.exe }} was executed by user {{ user.name b53edb8b-ff02-4b8d-820a-0cd9e0a42ec8 }} for credential harvesting.\n\n* **Privilege Escalation (April 21, 23:57:49)**: {{ process.name mimikatz.exe }} was executed by user {{ user.name 9bdca919-4ebf-419d-b6e8-d8b44a49daf9 }}.\n\n* **Command and Control (April 22, 00:58:43)**: {{ process.name powershell.exe }} established connections from {{ source.ip 10.165.5.78 }} to {{ destination.ip 10.227.128.134 }}.\n\n* **Second Wave (April 23, 06:10:38)**: The attackers returned with another execution of {{ process.name malware writer }} using the same user {{ user.name 790155dd-c99a-4241-b497-433e36f0d8b5 }} and same system privileges.\n\n* **Continued Network Activity (April 23, 06:53:37)**: The same pattern of {{ process.name notepad.exe }} connecting from {{ source.ip 10.110.157.207 }} to {{ destination.ip 10.246.31.27 }} was observed.\n\n* **Additional Credential Harvesting (April 23, 09:00:52)**: {{ process.name mimikatz.exe }} was executed again by user {{ user.name 9bdca919-4ebf-419d-b6e8-d8b44a49daf9 }}.\n\n* **Data Collection and Exfiltration (April 23, 18:26:41)**: The campaign culminated with {{ process.name notepad.exe }} being used for likely data exfiltration.',
      entitySummaryMarkdown:
        'Persistent attack campaign on {{ host.name d25f9128-820e-4998-a26d-0c62507541b4 }} spanning April 21-23 with consistent TTPs and user accounts',
      mitreAttackTactics: [
        'Initial Access',
        'Execution',
        'Persistence',
        'Privilege Escalation',
        'Credential Access',
        'Discovery',
        'Lateral Movement',
        'Collection',
        'Command and Control',
        'Exfiltration',
      ],
      summaryMarkdown:
        'Multi-day attack campaign on {{ host.name d25f9128-820e-4998-a26d-0c62507541b4 }} from April 21-23 showing consistent patterns of {{ process.name malware writer }} execution, network reconnaissance, credential harvesting with {{ process.name mimikatz.exe }}, and data exfiltration.',
      title: 'Linux Host Persistent Attack Campaign',
      timestamp: '2025-04-24T17:36:25.632Z',
    },
    {
      alertIds: [
        'd43710a39a3590a9ecebc7faecd33d6f04dc4891b5fc38702b3480d8becfd4aa',
        'daa409bfa90730dcc25181fc389669b86b2b1ec54c0d210769591bc5f73cdede',
        '1586c695d467889246ffc5e6ddfe3b46f52d6a4a0c0e453f25df2730a93dfc54',
        '25e95160ade107aa1746594636995c4897a41fe4fab6d7f29a0a3e4caa2a63e4',
        '13a75fe5d870f7bc47df2b1051dce08f13a2778fcbe5415ecf080a86d2f10190',
        'd6dc50546909bd9265d67089c527dc34518409f1ff458732a57d945f622f0bb1',
        'cbe63218d18c19f5a48ab0c95ee9018546783a05ccda1c2a58b39754a63d1f53',
        '3b3a1d4633306591fdf3c9dcaa03a24f7ba9e1e63596a401ff0301beddbaeb07',
        'ad98fc453900826573ddca5eb19dab465be188f3a02c984c5cdda3b1ccec1d9c',
        'bfcf0b5311172f7f87d3a36b9ceaac5e1fc4200ad9aabb5ba1b0480f42dc4e57',
        '5582b1708a833daba3be23d2226b1a84e388583497d6ef7431664e97ef691528',
        '1aff0e2673adad409f2f9904008d231fc60c5867cfb3c98a07ca2b5c34b73635',
      ],
      detailsMarkdown:
        '## macOS Host Attack Chain\n\nA distinct attack chain was observed on macOS host {{ host.name ba933963-be1f-4d58-b1ff-1a3baff87ef8 }}:\n\n* **Initial Access (April 21, 16:59:54)**: The attack began with {{ process.name powershell.exe }} establishing connections from {{ source.ip 10.67.234.101 }} to {{ destination.ip 10.137.112.54 }}.\n\n* **Execution (April 21, 17:06:26)**: {{ process.name notepad.exe }} was executed by user {{ user.name 589c83ce-2d23-44a4-8e9c-9ce3c9535481 }}.\n\n* **Discovery (April 21, 17:07:20)**: {{ process.name iexlorer.exe }} established connections from {{ source.ip 10.4.228.9 }} to {{ destination.ip 10.120.137.144 }}.\n\n* **Persistence (April 21, 17:36:19)**: {{ process.name malware writer }} was executed with {{ process.Ext.token.integrity_level_name system }} privileges by user {{ user.name 04293bbf-1bba-47d3-9abf-e3e3e24e24f9 }}.\n\n* **Lateral Movement (April 21, 18:11:08)**: {{ process.name notepad.exe }} established connections from {{ source.ip 10.217.217.199 }} to {{ destination.ip 10.54.98.80 }}.\n\n* **Privilege Escalation (April 21, 19:20:46)**: {{ process.name explorer.exe }} was executed by user {{ user.name 59b435b6-8627-4b28-8010-e0702955f6fc }}.\n\n* **Data Collection (April 21, 19:31:16 - 19:47:06)**: Multiple instances of {{ process.name malware writer }} were executed with system privileges.\n\n* **Command and Control (April 21, 20:13:30 - 20:55:42)**: Multiple instances of {{ process.name powershell.exe }} were executed by different users.\n\n* **Credential Access (April 21, 20:33:35)**: {{ process.name mimikatz.exe }} was executed by user {{ user.name 37ad0f7f-fecf-45ae-b35b-f61a911ee38d }}.\n\n* **Exfiltration (April 21, 21:15:51)**: {{ process.name lsass.exe }} established connections from {{ source.ip 10.86.116.72 }} to {{ destination.ip 10.62.70.34 }}, likely for data exfiltration.',
      entitySummaryMarkdown:
        'Attack chain on macOS {{ host.name ba933963-be1f-4d58-b1ff-1a3baff87ef8 }} involving multiple users and malicious processes',
      mitreAttackTactics: [
        'Initial Access',
        'Execution',
        'Persistence',
        'Privilege Escalation',
        'Credential Access',
        'Discovery',
        'Lateral Movement',
        'Collection',
        'Command and Control',
        'Exfiltration',
      ],
      summaryMarkdown:
        'Sophisticated attack on macOS {{ host.name ba933963-be1f-4d58-b1ff-1a3baff87ef8 }} beginning with {{ process.name powershell.exe }} establishing C2 connections, followed by discovery, persistence, credential access with {{ process.name mimikatz.exe }}, and data exfiltration.',
      title: 'macOS Host Advanced Persistent Threat',
      timestamp: '2025-04-24T17:36:25.632Z',
    },
  ],
  connectorName: 'Claude 3.7 Sonnet',
  enableFieldRendering: true,
  generationUuid: 'bb848edc-975c-4f38-ba88-f6e03a23a41c',
  replacements: {
    'c8db5601-e6fd-44b4-b645-21855715ce0a': '5psx2nlvzs',
    'd25f9128-820e-4998-a26d-0c62507541b4': 'Host-2jo95wayl3',
    '96908c11-7d55-48fe-a0dc-2a6de3b4736a': 'bwryodcxgq',
    '256b6a76-729e-42de-abb1-1b1583f1b0ba': 'wsztb7vumo',
    'e3a53869-c1be-459f-bf07-26ad89afc110': 'piwro06jtx',
    'd90db9ba-e964-4cf2-a88d-0f1b0fbffea1': '2p45oufte4',
    '1b326a75-a58c-4be5-bc1a-099cd1058622': 'b1vlxdnqif',
    '905a6fce-581f-4dc5-ae4a-80d2a3a9cd8a': 'glgomwyzbm',
    '1c1fbea6-bbf8-4d64-a32d-190b5b91a7c8': 'w52wr3mf6h',
    '9bdca919-4ebf-419d-b6e8-d8b44a49daf9': 'vjmicfxk1w',
    '66617ac5-ae65-411e-85af-2f23641033a7': 'iv6ippiktf',
    'b53edb8b-ff02-4b8d-820a-0cd9e0a42ec8': 'uo0elxwqht',
    '0e936e8d-054b-473c-92f0-edfad248e727': 'llam90iqjg',
    '25ecb7b0-3a2f-4d93-923e-1f740151859c': 'rvutmk7jpw',
    '7de4b044-34f0-4e58-a35a-08dca8be8e63': 'dtqtruuieh',
    'a88a40cc-f3d9-41aa-b931-5f32e13e3214': 'igkqtyoptp',
    '790155dd-c99a-4241-b497-433e36f0d8b5': '3fb04q6crg',
    'a792fad8-dd2a-4627-87ac-9fc7de04471d': 'ji4un060ft',
    'ba933963-be1f-4d58-b1ff-1a3baff87ef8': 'Host-oq4z2o322c',
    '7a3be8c8-fd40-40cd-8889-1306911e5c1e': '606mxklygd',
    'd238fbd8-fda3-4b7d-b849-3f792e7f5ddc': 'vbvsh6zdo6',
    '82d518af-728f-44b3-9bf4-9155c119c663': '25pivmp463',
    '52bb5279-e2f3-4038-b0f6-dea8d2fa8cfc': '5z5ufz0ybm',
    '8dfd9a11-b27a-4af8-b89c-b61821466a2a': 'l9iu7o9c6v',
    '9bcecb74-e2c2-42a3-b386-d10769cbf2cc': 'hfi2fqzfel',
    'fbbc0e7b-c391-44dd-b325-10f24f3180b2': '5aylswlg7p',
    '6cdbbe3e-f437-4160-a557-b8817406e2cb': '7f2c0ct7f0',
    '8da6ff34-4ca4-49fe-84c1-39dd76269255': 't5fnulvvu9',
    '25aed668-b51c-428f-8ed7-cb7076074927': 'ebujhte0ob',
    '2c92dc4a-ff8c-49e8-837e-118fa7ba5f2f': 'kzwi95tcjy',
    'c2e9cd59-e481-4c3c-a8a9-bafdd5982826': 'mf10wxe3sd',
    '68333292-b812-44de-b479-18a5b170925f': 'w2z8dlrp63',
    '46a697fe-1606-42d4-a6c0-b9e2c89f624f': 'tpl8v0lv4i',
    'a00479ef-9240-422f-a1de-06de25cc9cfe': '2pcdw35azv',
    '37ad0f7f-fecf-45ae-b35b-f61a911ee38d': 'fd7g0zb5mq',
    '193565aa-2523-4da6-9df4-5f7225e0dc31': 'jlomzbkc2w',
    '126fb618-7855-41ca-a079-ef1fb096ad4e': '8jeqnknvof',
    '8bc4314b-331a-458c-b167-bf355559e640': '05t3r3e2eq',
    '59b435b6-8627-4b28-8010-e0702955f6fc': '5mivs1zqgn',
    'd0c4fab3-df09-4564-b8ac-fadfcf35c4bf': 'mfpbbfq6u6',
    '04293bbf-1bba-47d3-9abf-e3e3e24e24f9': 'chrlu391fy',
    'ec771845-f7df-4f1d-8ef4-30ea6991308b': 'vnlwwxmjau',
    '589c83ce-2d23-44a4-8e9c-9ce3c9535481': 'qe0v3cel3g',
    'e5a6c255-8251-408c-9952-2eb1c746a25a': 'mr3ms78u3u',
    'af5c33f5-ebf0-486c-ba74-8ef9535e5c66': 'fge8acmng2',
    '077c4701-48c5-4cce-adee-cef0dff53350': 'Host-m1pewb1koa',
  },
  withReplacements: false,
};
