/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

import { AnonymizedAlertsRetriever } from '.';
import { getMockAnonymizationFieldResponse } from '../../../../../evaluation/__mocks__/mock_anonymization_fields';
import { getAnonymizedAlerts } from '../helpers/get_anonymized_alerts';

const anonymizationFields = getMockAnonymizationFieldResponse();

const rawAlerts = [
  '@timestamp,2024-11-05T15:42:48.034Z\n_id,07d86d116ff754f4aa57c00e23a5273c2efbc9450416823ebd1d7b343b42d11a\nevent.category,malware,intrusion_detection,process\nevent.dataset,endpoint.alerts\nevent.module,endpoint\nevent.outcome,success\nfile.hash.sha256,2c63ba2b1a5131b80e567b7a1a93997a2de07ea20d0a8f5149701c67b832c097\nfile.name,My Go Application.app\nfile.path,/private/var/folders/_b/rmcpc65j6nv11ygrs50ctcjr0000gn/T/AppTranslocation/6D63F08A-011C-4511-8556-EAEF9AFD6340/d/Setup.app/Contents/MacOS/My Go Application.app\nhost.name,d26e9abd-6cbb-4620-a802-a22b97845d5c\nhost.os.name,macOS\nhost.os.version,13.4\nkibana.alert.original_time,2023-06-19T00:28:06.888Z\nkibana.alert.risk_score,99\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Endpoint Security alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Malware Detection Alert\nkibana.alert.severity,critical\nkibana.alert.workflow_status,open\nmessage,Malware Detection Alert\nprocess.args,xpcproxy,application.Appify by Machine Box.My Go Application.20.23\nprocess.code_signature.exists,true\nprocess.code_signature.signing_id,a.out\nprocess.code_signature.status,code failed to satisfy specified code requirement(s)\nprocess.code_signature.subject_name,\nprocess.code_signature.trusted,false\nprocess.command_line,xpcproxy application.Appify by Machine Box.My Go Application.20.23\nprocess.executable,/private/var/folders/_b/rmcpc65j6nv11ygrs50ctcjr0000gn/T/AppTranslocation/6D63F08A-011C-4511-8556-EAEF9AFD6340/d/Setup.app/Contents/MacOS/My Go Application.app\nprocess.hash.md5,e62bdd3eaf2be436fca2e67b7eede603\nprocess.hash.sha1,58a3bddbc7c45193ecbefa22ad0496b60a29dff2\nprocess.hash.sha256,2c63ba2b1a5131b80e567b7a1a93997a2de07ea20d0a8f5149701c67b832c097\nprocess.name,My Go Application.app\nprocess.parent.args,/sbin/launchd\nprocess.parent.args_count,1\nprocess.parent.code_signature.exists,true\nprocess.parent.code_signature.status,No error.\nprocess.parent.code_signature.subject_name,Software Signing\nprocess.parent.code_signature.trusted,true\nprocess.parent.command_line,/sbin/launchd\nprocess.parent.executable,/sbin/launchd\nprocess.parent.name,launchd\nprocess.pid,1200\nuser.name,81c3db40-f3da-4c6a-b3c8-48c776148102',
  '@timestamp,2024-11-05T15:42:48.033Z\n_id,f2d2d8bd15402e8efff81d48b70ef8cb890d5502576fb92365ee2328f5fcb123\nevent.category,malware,intrusion_detection,process\nevent.dataset,endpoint.alerts\nevent.module,endpoint\nevent.outcome,success\nfile.hash.sha256,2c63ba2b1a5131b80e567b7a1a93997a2de07ea20d0a8f5149701c67b832c097\nfile.name,My Go Application.app\nfile.path,/private/var/folders/_b/rmcpc65j6nv11ygrs50ctcjr0000gn/T/AppTranslocation/3C4D44B9-4838-4613-BACC-BD00A9CE4025/d/Setup.app/Contents/MacOS/My Go Application.app\nhost.name,d26e9abd-6cbb-4620-a802-a22b97845d5c\nhost.os.name,macOS\nhost.os.version,13.4\nkibana.alert.original_time,2023-06-19T00:27:47.362Z\nkibana.alert.risk_score,99\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Endpoint Security alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Malware Detection Alert\nkibana.alert.severity,critical\nkibana.alert.workflow_status,open\nmessage,Malware Detection Alert\nprocess.args,xpcproxy,application.Appify by Machine Box.My Go Application.20.23\nprocess.code_signature.exists,true\nprocess.code_signature.signing_id,a.out\nprocess.code_signature.status,code failed to satisfy specified code requirement(s)\nprocess.code_signature.subject_name,\nprocess.code_signature.trusted,false\nprocess.command_line,xpcproxy application.Appify by Machine Box.My Go Application.20.23\nprocess.executable,/private/var/folders/_b/rmcpc65j6nv11ygrs50ctcjr0000gn/T/AppTranslocation/3C4D44B9-4838-4613-BACC-BD00A9CE4025/d/Setup.app/Contents/MacOS/My Go Application.app\nprocess.hash.md5,e62bdd3eaf2be436fca2e67b7eede603\nprocess.hash.sha1,58a3bddbc7c45193ecbefa22ad0496b60a29dff2\nprocess.hash.sha256,2c63ba2b1a5131b80e567b7a1a93997a2de07ea20d0a8f5149701c67b832c097\nprocess.name,My Go Application.app\nprocess.parent.args,/sbin/launchd\nprocess.parent.args_count,1\nprocess.parent.code_signature.exists,true\nprocess.parent.code_signature.status,No error.\nprocess.parent.code_signature.subject_name,Software Signing\nprocess.parent.code_signature.trusted,true\nprocess.parent.command_line,/sbin/launchd\nprocess.parent.executable,/sbin/launchd\nprocess.parent.name,launchd\nprocess.pid,1169\nuser.name,81c3db40-f3da-4c6a-b3c8-48c776148102',
];

jest.mock('../helpers/get_anonymized_alerts', () => ({
  getAnonymizedAlerts: jest.fn(),
}));

describe('AnonymizedAlertsRetriever', () => {
  let esClient: ElasticsearchClient;

  beforeEach(() => {
    jest.clearAllMocks();

    esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;

    (getAnonymizedAlerts as jest.Mock).mockResolvedValue([...rawAlerts]);
  });

  it('returns the expected pageContent and metadata', async () => {
    const retriever = new AnonymizedAlertsRetriever({
      alertsIndexPattern: 'test-pattern',
      anonymizationFields,
      esClient,
      size: 10,
    });

    const documents = await retriever._getRelevantDocuments('test-query');

    expect(documents).toEqual([
      {
        pageContent:
          '@timestamp,2024-11-05T15:42:48.034Z\n_id,07d86d116ff754f4aa57c00e23a5273c2efbc9450416823ebd1d7b343b42d11a\nevent.category,malware,intrusion_detection,process\nevent.dataset,endpoint.alerts\nevent.module,endpoint\nevent.outcome,success\nfile.hash.sha256,2c63ba2b1a5131b80e567b7a1a93997a2de07ea20d0a8f5149701c67b832c097\nfile.name,My Go Application.app\nfile.path,/private/var/folders/_b/rmcpc65j6nv11ygrs50ctcjr0000gn/T/AppTranslocation/6D63F08A-011C-4511-8556-EAEF9AFD6340/d/Setup.app/Contents/MacOS/My Go Application.app\nhost.name,d26e9abd-6cbb-4620-a802-a22b97845d5c\nhost.os.name,macOS\nhost.os.version,13.4\nkibana.alert.original_time,2023-06-19T00:28:06.888Z\nkibana.alert.risk_score,99\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Endpoint Security alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Malware Detection Alert\nkibana.alert.severity,critical\nkibana.alert.workflow_status,open\nmessage,Malware Detection Alert\nprocess.args,xpcproxy,application.Appify by Machine Box.My Go Application.20.23\nprocess.code_signature.exists,true\nprocess.code_signature.signing_id,a.out\nprocess.code_signature.status,code failed to satisfy specified code requirement(s)\nprocess.code_signature.subject_name,\nprocess.code_signature.trusted,false\nprocess.command_line,xpcproxy application.Appify by Machine Box.My Go Application.20.23\nprocess.executable,/private/var/folders/_b/rmcpc65j6nv11ygrs50ctcjr0000gn/T/AppTranslocation/6D63F08A-011C-4511-8556-EAEF9AFD6340/d/Setup.app/Contents/MacOS/My Go Application.app\nprocess.hash.md5,e62bdd3eaf2be436fca2e67b7eede603\nprocess.hash.sha1,58a3bddbc7c45193ecbefa22ad0496b60a29dff2\nprocess.hash.sha256,2c63ba2b1a5131b80e567b7a1a93997a2de07ea20d0a8f5149701c67b832c097\nprocess.name,My Go Application.app\nprocess.parent.args,/sbin/launchd\nprocess.parent.args_count,1\nprocess.parent.code_signature.exists,true\nprocess.parent.code_signature.status,No error.\nprocess.parent.code_signature.subject_name,Software Signing\nprocess.parent.code_signature.trusted,true\nprocess.parent.command_line,/sbin/launchd\nprocess.parent.executable,/sbin/launchd\nprocess.parent.name,launchd\nprocess.pid,1200\nuser.name,81c3db40-f3da-4c6a-b3c8-48c776148102',
        metadata: {},
      },
      {
        pageContent:
          '@timestamp,2024-11-05T15:42:48.033Z\n_id,f2d2d8bd15402e8efff81d48b70ef8cb890d5502576fb92365ee2328f5fcb123\nevent.category,malware,intrusion_detection,process\nevent.dataset,endpoint.alerts\nevent.module,endpoint\nevent.outcome,success\nfile.hash.sha256,2c63ba2b1a5131b80e567b7a1a93997a2de07ea20d0a8f5149701c67b832c097\nfile.name,My Go Application.app\nfile.path,/private/var/folders/_b/rmcpc65j6nv11ygrs50ctcjr0000gn/T/AppTranslocation/3C4D44B9-4838-4613-BACC-BD00A9CE4025/d/Setup.app/Contents/MacOS/My Go Application.app\nhost.name,d26e9abd-6cbb-4620-a802-a22b97845d5c\nhost.os.name,macOS\nhost.os.version,13.4\nkibana.alert.original_time,2023-06-19T00:27:47.362Z\nkibana.alert.risk_score,99\nkibana.alert.rule.description,Generates a detection alert each time an Elastic Endpoint Security alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.\nkibana.alert.rule.name,Malware Detection Alert\nkibana.alert.severity,critical\nkibana.alert.workflow_status,open\nmessage,Malware Detection Alert\nprocess.args,xpcproxy,application.Appify by Machine Box.My Go Application.20.23\nprocess.code_signature.exists,true\nprocess.code_signature.signing_id,a.out\nprocess.code_signature.status,code failed to satisfy specified code requirement(s)\nprocess.code_signature.subject_name,\nprocess.code_signature.trusted,false\nprocess.command_line,xpcproxy application.Appify by Machine Box.My Go Application.20.23\nprocess.executable,/private/var/folders/_b/rmcpc65j6nv11ygrs50ctcjr0000gn/T/AppTranslocation/3C4D44B9-4838-4613-BACC-BD00A9CE4025/d/Setup.app/Contents/MacOS/My Go Application.app\nprocess.hash.md5,e62bdd3eaf2be436fca2e67b7eede603\nprocess.hash.sha1,58a3bddbc7c45193ecbefa22ad0496b60a29dff2\nprocess.hash.sha256,2c63ba2b1a5131b80e567b7a1a93997a2de07ea20d0a8f5149701c67b832c097\nprocess.name,My Go Application.app\nprocess.parent.args,/sbin/launchd\nprocess.parent.args_count,1\nprocess.parent.code_signature.exists,true\nprocess.parent.code_signature.status,No error.\nprocess.parent.code_signature.subject_name,Software Signing\nprocess.parent.code_signature.trusted,true\nprocess.parent.command_line,/sbin/launchd\nprocess.parent.executable,/sbin/launchd\nprocess.parent.name,launchd\nprocess.pid,1169\nuser.name,81c3db40-f3da-4c6a-b3c8-48c776148102',
        metadata: {},
      },
    ]);
  });

  it('calls getAnonymizedAlerts with the expected parameters', async () => {
    const onNewReplacements = jest.fn();
    const mockReplacements = {
      replacement1: 'SRVMAC08',
      replacement2: 'SRVWIN01',
      replacement3: 'SRVWIN02',
    };
    const start = '2025-01-01T00:00:00.000Z';
    const end = '2025-01-02T00:00:00.000Z';
    const filter = {
      bool: {
        must: [],
        filter: [
          {
            match_phrase: {
              'user.name': 'root',
            },
          },
        ],
        should: [],
        must_not: [
          {
            match_phrase: {
              'host.name': 'foo',
            },
          },
        ],
      },
    };

    const retriever = new AnonymizedAlertsRetriever({
      alertsIndexPattern: 'test-pattern',
      anonymizationFields,
      end,
      esClient,
      filter,
      onNewReplacements,
      replacements: mockReplacements,
      size: 10,
      start,
    });

    await retriever._getRelevantDocuments('test-query');

    expect(getAnonymizedAlerts as jest.Mock).toHaveBeenCalledWith({
      alertsIndexPattern: 'test-pattern',
      anonymizationFields,
      end,
      esClient,
      filter,
      onNewReplacements,
      replacements: mockReplacements,
      size: 10,
      start,
    });
  });

  it('handles empty anonymized alerts', async () => {
    (getAnonymizedAlerts as jest.Mock).mockResolvedValue([]);

    const retriever = new AnonymizedAlertsRetriever({
      esClient,
      alertsIndexPattern: 'test-pattern',
      anonymizationFields,
      size: 10,
    });

    const documents = await retriever._getRelevantDocuments('test-query');

    expect(documents).toHaveLength(0);
  });
});
