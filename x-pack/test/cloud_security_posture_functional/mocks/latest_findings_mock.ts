/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const timeOneHourAgo = (Date.now() - 3600000).toString();

export const k8sFindingsMock = [
  {
    agent: {
      name: 'kind-multi-worker',
      id: 'f6d3cea6-7893-45cf-aba9-4961bf955853',
      ephemeral_id: '528cabe6-19d6-443d-bf17-40f2a0014419',
      type: 'cloudbeat',
      version: '8.12.0',
    },
    process: {
      args: [
        '/usr/bin/kubelet',
        '--bootstrap-kubeconfig=/etc/kubernetes/bootstrap-kubelet.conf',
        '--kubeconfig=/etc/kubernetes/kubelet.conf',
        '--config=/var/lib/kubelet/config.yaml',
        '--container-runtime=remote',
        '--container-runtime-endpoint=unix:///run/containerd/containerd.sock',
        '--fail-swap-on=false',
        '--node-ip=172.18.0.3',
        '--node-labels=',
        '--pod-infra-container-image=k8s.gcr.io/pause:3.6',
        '--provider-id=kind://docker/kind-multi/kind-multi-worker',
        '--fail-swap-on=false',
        '--cgroup-root=/kubelet',
      ],
      parent: {
        pid: 1,
      },
      pgid: 197,
      name: 'kubelet',
      start: '2023-04-10T12:21:01.160Z',
      pid: 197,
      args_count: 13,
      title: 'kubelet',
      command_line:
        '/usr/bin/kubelet --bootstrap-kubeconfig=/etc/kubernetes/bootstrap-kubelet.conf --kubeconfig=/etc/kubernetes/kubelet.conf --config=/var/lib/kubelet/config.yaml --container-runtime=remote --container-runtime-endpoint=unix:///run/containerd/containerd.sock --fail-swap-on=false --node-ip=172.18.0.3 --node-labels= --pod-infra-container-image=k8s.gcr.io/pause:3.6 --provider-id=kind://docker/kind-multi/kind-multi-worker --fail-swap-on=false --cgroup-root=/kubelet',
      uptime: 25320267,
    },
    resource: {
      sub_type: 'process',
      name: 'kubelet',
      raw: {
        stat: {
          UserTime: '12186434',
          Group: '197',
          RealGID: '',
          Parent: '1',
          StartTime: '439085',
          ResidentSize: '84292000',
          SavedGID: '',
          TotalSize: '2914080000',
          EffectiveUID: '',
          Name: 'kubelet',
          Threads: '30',
          RealUID: '',
          State: 'S',
          Nice: '0',
          SavedUID: '',
          EffectiveGID: '',
          SystemTime: '9042092',
        },
        external_data: {
          config: {
            nodeStatusReportFrequency: '0s',
            cpuManagerReconcilePeriod: '0s',
            shutdownGracePeriod: '0s',
            syncFrequency: '0s',
            httpCheckFrequency: '0s',
            clusterDomain: 'cluster.local',
            healthzPort: 10248,
            evictionHard: {
              'imagefs.available': '0%',
              'nodefs.available': '0%',
              'nodefs.inodesFree': '0%',
            },
            staticPodPath: '/etc/kubernetes/manifests',
            nodeStatusUpdateFrequency: '0s',
            authorization: {
              mode: 'Webhook',
              webhook: {
                cacheAuthorizedTTL: '0s',
                cacheUnauthorizedTTL: '0s',
              },
            },
            volumeStatsAggPeriod: '0s',
            apiVersion: 'kubelet.config.k8s.io/v1beta1',
            evictionPressureTransitionPeriod: '0s',
            runtimeRequestTimeout: '0s',
            clusterDNS: ['10.96.0.10'],
            authentication: {
              x509: {
                clientCAFile: '/etc/kubernetes/pki/ca.crt',
              },
              webhook: {
                cacheTTL: '0s',
                enabled: true,
              },
              anonymous: {
                enabled: false,
              },
            },
            memorySwap: {},
            imageMinimumGCAge: '0s',
            kind: 'KubeletConfiguration',
            rotateCertificates: true,
            imageGCHighThresholdPercent: 100,
            cgroupDriver: 'cgroupfs',
            logging: {
              flushFrequency: 0,
              options: {
                json: {
                  infoBufferSize: '0',
                },
              },
              verbosity: 0,
            },
            streamingConnectionIdleTimeout: '0s',
            shutdownGracePeriodCriticalPods: '0s',
            fileCheckFrequency: '0s',
            healthzBindAddress: '127.0.0.1',
          },
        },
        pid: '197',
        command:
          '/usr/bin/kubelet --bootstrap-kubeconfig=/etc/kubernetes/bootstrap-kubelet.conf --kubeconfig=/etc/kubernetes/kubelet.conf --config=/var/lib/kubelet/config.yaml --container-runtime=remote --container-runtime-endpoint=unix:///run/containerd/containerd.sock --fail-swap-on=false --node-ip=172.18.0.3 --node-labels= --pod-infra-container-image=k8s.gcr.io/pause:3.6 --provider-id=kind://docker/kind-multi/kind-multi-worker --fail-swap-on=false --cgroup-root=/kubelet',
      },
      id: 'b5848858-d546-5f81-b681-9b6ae6fb145f',
      type: 'process',
    },
    cloud_security_posture: {
      package_policy: {
        id: '16aec061-cb66-472d-956a-51a23bcea333',
        revision: 3,
      },
    },
    elastic_agent: {
      id: 'f6d3cea6-7893-45cf-aba9-4961bf955853',
      version: '8.12.0',
      snapshot: false,
    },
    rule: {
      references: '1. https://kubernetes.io/docs/admin/kubelet/',
      impact:
        'Removal of the read-only port will require that any service which made use of it will need to be re-configured to use the main Kubelet API.',
      description: 'Disable the read-only port.',
      default_value:
        'By default, `--read-only-port` is set to `10255/TCP`. However, if a config file\nis specified by --config the default value for `readOnlyPort` is `0`.\n',
      section: 'Kubelet',
      rationale:
        'The Kubelet process provides a read-only API in addition to the main Kubelet API.\nUnauthenticated access is provided to this read-only API which could possibly retrieve potentially sensitive information about the cluster.',
      version: '1.0',
      benchmark: {
        name: 'CIS Kubernetes V1.23',
        rule_number: '4.2.4',
        id: 'cis_k8s',
        version: 'v1.0.1',
        posture_type: 'kspm',
      },
      tags: ['CIS', 'Kubernetes', 'CIS 4.2.4', 'Kubelet'],
      remediation:
        'If using a Kubelet config file, edit the file to set `readOnlyPort` to `0`.\n\nIf using command line arguments, edit the kubelet service file `/etc/systemd/system/kubelet.service.d/10-kubeadm.conf` on each worker node and set the below parameter in `KUBELET_SYSTEM_PODS_ARGS` variable.\n\n```\n--read-only-port=0\n```\n\nBased on your system, restart the `kubelet` service.\nFor example:\n\n```\nsystemctl daemon-reload\nsystemctl restart kubelet.service\n```',
      audit:
        'Run the following command on each node:\n\n```\nps -ef | grep kubelet\n```\n\nVerify that the `--read-only-port` argument exists and is set to `0`.\n\nIf the `--read-only-port` argument is not present, check that there is a Kubelet config file specified by `--config`.\nCheck that if there is a `readOnlyPort` entry in the file, it is set to `0`.',
      name: 'Verify that the --read-only-port argument is set to 0',
      id: '95e368ec-eebe-5aa1-bc86-9fa532a82d3a',
      profile_applicability: '* Level 1 - Worker Node',
    },
    message: 'Rule "Verify that the --read-only-port argument is set to 0": failed',
    result: {
      evaluation: 'failed',
      evidence: {
        process_args: {
          '--cgroup-root': '/kubelet',
          '--kubeconfig': '/etc/kubernetes/kubelet.conf',
          '--node-ip': '172.18.0.3',
          '--container-runtime': 'remote',
          '--node-labels': '',
          '--/usr/bin/kubelet': '',
          '--bootstrap-kubeconfig': '/etc/kubernetes/bootstrap-kubelet.conf',
          '--fail-swap-on': 'false',
          '--provider-id': 'kind://docker/kind-multi/kind-multi-worker',
          '--pod-infra-container-image': 'k8s.gcr.io/pause:3.6',
          '--container-runtime-endpoint': 'unix:///run/containerd/containerd.sock',
          '--config': '/var/lib/kubelet/config.yaml',
        },
        process_config: {
          config: {
            nodeStatusReportFrequency: '0s',
            cpuManagerReconcilePeriod: '0s',
            shutdownGracePeriod: '0s',
            httpCheckFrequency: '0s',
            syncFrequency: '0s',
            clusterDomain: 'cluster.local',
            healthzPort: 10248,
            evictionHard: {
              'imagefs.available': '0%',
              'nodefs.available': '0%',
              'nodefs.inodesFree': '0%',
            },
            staticPodPath: '/etc/kubernetes/manifests',
            nodeStatusUpdateFrequency: '0s',
            authorization: {
              mode: 'Webhook',
              webhook: {
                cacheAuthorizedTTL: '0s',
                cacheUnauthorizedTTL: '0s',
              },
            },
            volumeStatsAggPeriod: '0s',
            apiVersion: 'kubelet.config.k8s.io/v1beta1',
            evictionPressureTransitionPeriod: '0s',
            runtimeRequestTimeout: '0s',
            clusterDNS: ['10.96.0.10'],
            authentication: {
              x509: {
                clientCAFile: '/etc/kubernetes/pki/ca.crt',
              },
              webhook: {
                cacheTTL: '0s',
                enabled: true,
              },
              anonymous: {
                enabled: false,
              },
            },
            memorySwap: {},
            imageMinimumGCAge: '0s',
            kind: 'KubeletConfiguration',
            rotateCertificates: true,
            imageGCHighThresholdPercent: 100,
            cgroupDriver: 'cgroupfs',
            logging: {
              flushFrequency: 0,
              options: {
                json: {
                  infoBufferSize: '0',
                },
              },
              verbosity: 0,
            },
            streamingConnectionIdleTimeout: '0s',
            shutdownGracePeriodCriticalPods: '0s',
            fileCheckFrequency: '0s',
            healthzBindAddress: '127.0.0.1',
          },
        },
      },
      expected: null,
    },
    orchestrator: {
      cluster: {
        name: 'kind-multi',
        id: '80b085f5-c172-4143-a74d-4b881c51edb2',
        version: 'v1.23.12',
      },
    },
    cluster_id: '80b085f5-c172-4143-a74d-4b881c51edb2',
    '@timestamp': timeOneHourAgo,
    cloudbeat: {
      commit_sha: 'b23ca39a0ca08aa94f8e4a644517bb73f3cf1f66',
      commit_time: '2024-01-11T09:14:22Z',
      version: '8.12.0',
      policy: {
        commit_sha: 'b23ca39a0ca08aa94f8e4a644517bb73f3cf1f66',
        commit_time: '2024-01-11T09:14:22Z',
        version: '8.12.0',
      },
    },
    ecs: {
      version: '8.6.0',
    },
    data_stream: {
      namespace: 'default',
      type: 'logs',
      dataset: 'cloud_security_posture.findings',
    },
    host: {
      name: 'kind-multi-worker',
    },
    event: {
      agent_id_status: 'auth_metadata_missing',
      sequence: 1706449528,
      ingested: '2024-01-28T13:49:31Z',
      kind: 'state',
      created: '2024-01-28T13:45:28.365459493Z',
      id: '0f4cca7e-4160-4060-ad1b-af122ee71e7d',
      type: ['info'],
      category: ['configuration'],
      dataset: 'cloud_security_posture.findings',
      outcome: 'success',
    },
  },
  {
    agent: {
      name: 'kind-multi-control-plane',
      id: '92265e5e-4694-4056-8c10-f5d588cc95a8',
      type: 'cloudbeat',
      ephemeral_id: '6bdf59e6-e13c-4a39-8f31-8ad2fc96343f',
      version: '8.12.0',
    },
    resource: {
      sub_type: 'file',
      name: '/hostfs/etc/kubernetes/manifests/kube-apiserver.yaml',
      raw: {
        owner: 'root',
        inode: '776303',
        mode: '600',
        uid: '0',
        path: '/hostfs/etc/kubernetes/manifests/kube-apiserver.yaml',
        gid: '0',
        sub_type: 'file',
        name: 'kube-apiserver.yaml',
        group: 'root',
      },
      id: '07afe6a0-970d-5767-a0c2-8839d414c904',
      type: 'file',
    },
    cloud_security_posture: {
      package_policy: {
        id: '16aec061-cb66-472d-956a-51a23bcea333',
        revision: 3,
      },
    },
    elastic_agent: {
      id: '92265e5e-4694-4056-8c10-f5d588cc95a8',
      version: '8.12.0',
      snapshot: false,
    },
    rule: {
      references: '1. https://kubernetes.io/docs/admin/kube-apiserver/',
      impact: 'None',
      description:
        'Ensure that the API server pod specification file has permissions of `644` or more restrictive.',
      default_value: 'By default, the `kube-apiserver.yaml` file has permissions of `640`.\n',
      section: 'Control Plane Node Configuration Files',
      version: '1.0',
      rationale:
        'The API server pod specification file controls various parameters that set the behavior of the API server.\nYou should restrict its file permissions to maintain the integrity of the file.\nThe file should be writable by only the administrators on the system.',
      benchmark: {
        name: 'CIS Kubernetes V1.23',
        rule_number: '1.1.1',
        id: 'cis_k8s',
        version: 'v1.0.1',
        posture_type: 'kspm',
      },
      tags: ['CIS', 'Kubernetes', 'CIS 1.1.1', 'Control Plane Node Configuration Files'],
      remediation:
        'Run the below command (based on the file location on your system) on the Control Plane node.\nFor example,\n\n```\nchmod 644 /etc/kubernetes/manifests/kube-apiserver.yaml\n```',
      audit:
        'Run the below command (based on the file location on your system) on the Control Plane node.\nFor example,\n\n```\nstat -c %a /etc/kubernetes/manifests/kube-apiserver.yaml\n```\n\nVerify that the permissions are `644` or more restrictive.',
      name: 'Ensure that the API server pod specification file permissions are set to 644 or more restrictive',
      id: 'c444d9e3-d3de-5598-90e7-95a922b51664',
      profile_applicability: '* Level 1 - Master Node',
    },
    message:
      'Rule "Ensure that the API server pod specification file permissions are set to 644 or more restrictive": passed',
    result: {
      evaluation: 'passed',
      evidence: {
        filemode: '600',
      },
      expected: {
        filemode: '644',
      },
    },
    orchestrator: {
      cluster: {
        name: 'kind-multi',
        id: '80b085f5-c172-4143-a74d-4b881c51edb2',
        version: 'v1.23.12',
      },
    },
    cluster_id: '80b085f5-c172-4143-a74d-4b881c51edb2',
    '@timestamp': '2024-01-29T13:45:03.456Z',
    file: {
      owner: 'root',
      mode: '600',
      inode: '776303',
      path: '/hostfs/etc/kubernetes/manifests/kube-apiserver.yaml',
      uid: '0',
      extension: '.yaml',
      gid: '0',
      size: 3869,
      name: 'kube-apiserver.yaml',
      type: 'file',
      directory: '/hostfs/etc/kubernetes/manifests',
      group: 'root',
    },
    cloudbeat: {
      commit_sha: 'b23ca39a0ca08aa94f8e4a644517bb73f3cf1f66',
      commit_time: '2024-01-11T09:14:22Z',
      version: '8.12.0',
      policy: {
        commit_sha: 'b23ca39a0ca08aa94f8e4a644517bb73f3cf1f66',
        commit_time: '2024-01-11T09:14:22Z',
        version: '8.12.0',
      },
    },
    ecs: {
      version: '8.6.0',
    },
    data_stream: {
      namespace: 'default',
      type: 'logs',
      dataset: 'cloud_security_posture.findings',
    },
    host: {
      name: 'kind-multi-control-plane',
    },
    event: {
      agent_id_status: 'auth_metadata_missing',
      sequence: 1706535902,
      ingested: '2024-01-29T13:49:51Z',
      created: '2024-01-29T13:45:03.456357519Z',
      kind: 'state',
      id: '433d9499-64b9-4f71-ae96-6e0439a0c776',
      type: ['info'],
      category: ['configuration'],
      dataset: 'cloud_security_posture.findings',
      outcome: 'success',
    },
  },
  {
    agent: {
      name: 'kind-multi-worker',
      id: 'f6d3cea6-7893-45cf-aba9-4961bf955853',
      ephemeral_id: '528cabe6-19d6-443d-bf17-40f2a0014419',
      type: 'cloudbeat',
      version: '8.12.0',
    },
    process: {
      args: [
        '/usr/bin/kubelet',
        '--bootstrap-kubeconfig=/etc/kubernetes/bootstrap-kubelet.conf',
        '--kubeconfig=/etc/kubernetes/kubelet.conf',
        '--config=/var/lib/kubelet/config.yaml',
        '--container-runtime=remote',
        '--container-runtime-endpoint=unix:///run/containerd/containerd.sock',
        '--fail-swap-on=false',
        '--node-ip=172.18.0.3',
        '--node-labels=',
        '--pod-infra-container-image=k8s.gcr.io/pause:3.6',
        '--provider-id=kind://docker/kind-multi/kind-multi-worker',
        '--fail-swap-on=false',
        '--cgroup-root=/kubelet',
      ],
      parent: {
        pid: 1,
      },
      pgid: 197,
      start: '2023-04-10T12:21:01.160Z',
      name: 'kubelet',
      pid: 197,
      args_count: 13,
      title: 'kubelet',
      command_line:
        '/usr/bin/kubelet --bootstrap-kubeconfig=/etc/kubernetes/bootstrap-kubelet.conf --kubeconfig=/etc/kubernetes/kubelet.conf --config=/var/lib/kubelet/config.yaml --container-runtime=remote --container-runtime-endpoint=unix:///run/containerd/containerd.sock --fail-swap-on=false --node-ip=172.18.0.3 --node-labels= --pod-infra-container-image=k8s.gcr.io/pause:3.6 --provider-id=kind://docker/kind-multi/kind-multi-worker --fail-swap-on=false --cgroup-root=/kubelet',
      uptime: 25320267,
    },
    resource: {
      sub_type: 'process',
      name: 'kubelet',
      raw: {
        stat: {
          UserTime: '12186434',
          Group: '197',
          RealGID: '',
          Parent: '1',
          StartTime: '439085',
          ResidentSize: '84292000',
          EffectiveUID: '',
          TotalSize: '2914080000',
          SavedGID: '',
          Name: 'kubelet',
          Threads: '30',
          RealUID: '',
          State: 'S',
          Nice: '0',
          EffectiveGID: '',
          SavedUID: '',
          SystemTime: '9042092',
        },
        external_data: {
          config: {
            nodeStatusReportFrequency: '0s',
            shutdownGracePeriod: '0s',
            cpuManagerReconcilePeriod: '0s',
            syncFrequency: '0s',
            httpCheckFrequency: '0s',
            clusterDomain: 'cluster.local',
            healthzPort: 10248,
            evictionHard: {
              'imagefs.available': '0%',
              'nodefs.available': '0%',
              'nodefs.inodesFree': '0%',
            },
            staticPodPath: '/etc/kubernetes/manifests',
            nodeStatusUpdateFrequency: '0s',
            authorization: {
              mode: 'Webhook',
              webhook: {
                cacheAuthorizedTTL: '0s',
                cacheUnauthorizedTTL: '0s',
              },
            },
            volumeStatsAggPeriod: '0s',
            apiVersion: 'kubelet.config.k8s.io/v1beta1',
            evictionPressureTransitionPeriod: '0s',
            runtimeRequestTimeout: '0s',
            clusterDNS: ['10.96.0.10'],
            authentication: {
              x509: {
                clientCAFile: '/etc/kubernetes/pki/ca.crt',
              },
              webhook: {
                cacheTTL: '0s',
                enabled: true,
              },
              anonymous: {
                enabled: false,
              },
            },
            memorySwap: {},
            imageMinimumGCAge: '0s',
            kind: 'KubeletConfiguration',
            rotateCertificates: true,
            imageGCHighThresholdPercent: 100,
            cgroupDriver: 'cgroupfs',
            logging: {
              flushFrequency: 0,
              options: {
                json: {
                  infoBufferSize: '0',
                },
              },
              verbosity: 0,
            },
            streamingConnectionIdleTimeout: '0s',
            shutdownGracePeriodCriticalPods: '0s',
            fileCheckFrequency: '0s',
            healthzBindAddress: '127.0.0.1',
          },
        },
        pid: '197',
        command:
          '/usr/bin/kubelet --bootstrap-kubeconfig=/etc/kubernetes/bootstrap-kubelet.conf --kubeconfig=/etc/kubernetes/kubelet.conf --config=/var/lib/kubelet/config.yaml --container-runtime=remote --container-runtime-endpoint=unix:///run/containerd/containerd.sock --fail-swap-on=false --node-ip=172.18.0.3 --node-labels= --pod-infra-container-image=k8s.gcr.io/pause:3.6 --provider-id=kind://docker/kind-multi/kind-multi-worker --fail-swap-on=false --cgroup-root=/kubelet',
      },
      id: 'b5848858-d546-5f81-b681-9b6ae6fb145f',
      type: 'process',
    },
    cloud_security_posture: {
      package_policy: {
        id: '16aec061-cb66-472d-956a-51a23bcea333',
        revision: 3,
      },
    },
    elastic_agent: {
      id: 'f6d3cea6-7893-45cf-aba9-4961bf955853',
      version: '8.12.0',
      snapshot: false,
    },
    rule: {
      references: '',
      impact: '',
      description: 'Setup TLS connection on the Kubelets.',
      section: 'Kubelet',
      default_value: '',
      version: '1.0',
      rationale:
        'The connections from the apiserver to the kubelet are used for fetching logs for pods, attaching (through kubectl) to running pods, and using the kubelet’s port-forwarding functionality.\nThese connections terminate at the kubelet’s HTTPS endpoint.\nBy default, the apiserver does not verify the kubelet’s serving certificate, which makes the connection subject to man-in-the-middle attacks, and unsafe to run over untrusted and/or public networks.',
      benchmark: {
        name: 'CIS Kubernetes V1.23',
        rule_number: '4.2.10',
        id: 'cis_k8s',
        version: 'v1.0.1',
        posture_type: 'kspm',
      },
      tags: ['CIS', 'Kubernetes', 'CIS 4.2.10', 'Kubelet'],
      remediation:
        'If using a Kubelet config file, edit the file to set tlsCertFile to the location of the certificate file to use to identify this Kubelet, and tlsPrivateKeyFile to the location of the corresponding private key file.\n\nIf using command line arguments, edit the kubelet service file /etc/systemd/system/kubelet.service.d/10-kubeadm.conf on each worker node and set the below parameters in KUBELET_CERTIFICATE_ARGS variable.\n\n--tls-cert-file=<path/to/tls-certificate-file> --tls-private-key-file=<path/to/tls-key-file>\nBased on your system, restart the kubelet service.\nFor example:\n\n```\nsystemctl daemon-reload\nsystemctl restart kubelet.service\n```',
      audit:
        'Run the following command on each node:\n\n```\nps -ef | grep kubelet\n```\n\nVerify that the --tls-cert-file and --tls-private-key-file arguments exist and they are set as appropriate.\n\nIf these arguments are not present, check that there is a Kubelet config specified by --config and that it contains appropriate settings for tlsCertFile and tlsPrivateKeyFile.',
      name: 'Ensure that the --tls-cert-file and --tls-private-key-file arguments are set as appropriate',
      id: 'f78dad83-1fe2-5aba-8507-64ea9efb53d6',
      profile_applicability: '* Level 1 - Worker Node',
    },
    message:
      'Rule "Ensure that the --tls-cert-file and --tls-private-key-file arguments are set as appropriate": failed',
    result: {
      evaluation: 'failed',
      evidence: {
        process_config: {
          config: {
            nodeStatusReportFrequency: '0s',
            shutdownGracePeriod: '0s',
            cpuManagerReconcilePeriod: '0s',
            syncFrequency: '0s',
            httpCheckFrequency: '0s',
            clusterDomain: 'cluster.local',
            healthzPort: 10248,
            evictionHard: {
              'imagefs.available': '0%',
              'nodefs.available': '0%',
              'nodefs.inodesFree': '0%',
            },
            nodeStatusUpdateFrequency: '0s',
            staticPodPath: '/etc/kubernetes/manifests',
            authorization: {
              mode: 'Webhook',
              webhook: {
                cacheAuthorizedTTL: '0s',
                cacheUnauthorizedTTL: '0s',
              },
            },
            volumeStatsAggPeriod: '0s',
            apiVersion: 'kubelet.config.k8s.io/v1beta1',
            evictionPressureTransitionPeriod: '0s',
            runtimeRequestTimeout: '0s',
            clusterDNS: ['10.96.0.10'],
            authentication: {
              x509: {
                clientCAFile: '/etc/kubernetes/pki/ca.crt',
              },
              webhook: {
                cacheTTL: '0s',
                enabled: true,
              },
              anonymous: {
                enabled: false,
              },
            },
            memorySwap: {},
            imageMinimumGCAge: '0s',
            kind: 'KubeletConfiguration',
            rotateCertificates: true,
            imageGCHighThresholdPercent: 100,
            cgroupDriver: 'cgroupfs',
            logging: {
              flushFrequency: 0,
              options: {
                json: {
                  infoBufferSize: '0',
                },
              },
              verbosity: 0,
            },
            streamingConnectionIdleTimeout: '0s',
            shutdownGracePeriodCriticalPods: '0s',
            fileCheckFrequency: '0s',
            healthzBindAddress: '127.0.0.1',
          },
        },
        process_args: {
          '--cgroup-root': '/kubelet',
          '--kubeconfig': '/etc/kubernetes/kubelet.conf',
          '--node-ip': '172.18.0.3',
          '--node-labels': '',
          '--container-runtime': 'remote',
          '--/usr/bin/kubelet': '',
          '--bootstrap-kubeconfig': '/etc/kubernetes/bootstrap-kubelet.conf',
          '--fail-swap-on': 'false',
          '--provider-id': 'kind://docker/kind-multi/kind-multi-worker',
          '--pod-infra-container-image': 'k8s.gcr.io/pause:3.6',
          '--container-runtime-endpoint': 'unix:///run/containerd/containerd.sock',
          '--config': '/var/lib/kubelet/config.yaml',
        },
      },
      expected: null,
    },
    orchestrator: {
      cluster: {
        name: 'kind-multi',
        id: '80b085f5-c172-4143-a74d-4b881c51edb2',
        version: 'v1.23.12',
      },
    },
    cluster_id: '80b085f5-c172-4143-a74d-4b881c51edb2',
    '@timestamp': timeOneHourAgo,
    cloudbeat: {
      commit_sha: 'b23ca39a0ca08aa94f8e4a644517bb73f3cf1f66',
      commit_time: '2024-01-11T09:14:22Z',
      version: '8.12.0',
      policy: {
        commit_sha: 'b23ca39a0ca08aa94f8e4a644517bb73f3cf1f66',
        commit_time: '2024-01-11T09:14:22Z',
        version: '8.12.0',
      },
    },
    ecs: {
      version: '8.6.0',
    },
    data_stream: {
      namespace: 'default',
      type: 'logs',
      dataset: 'cloud_security_posture.findings',
    },
    host: {
      name: 'kind-multi-worker',
    },
    event: {
      agent_id_status: 'auth_metadata_missing',
      sequence: 1706449528,
      ingested: '2024-01-28T13:49:31Z',
      created: '2024-01-28T13:45:28.365459493Z',
      kind: 'state',
      id: '126158e6-1c6f-4087-83a7-59108f116e67',
      type: ['info'],
      category: ['configuration'],
      dataset: 'cloud_security_posture.findings',
      outcome: 'success',
    },
  },
];
