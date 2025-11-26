# General Goal

## Summary

A key part of the **SIEM Readiness** page is the ability to categorize indices, pipelines, and data sources into **five main groups** based on the types of logs they contain.

We’ll use the `event.category` field (along with other relevant fields) to determine which group each data source belongs to. These groups will then be referenced across different tabs in the SIEM Readiness page — specifically **Quality**, **Continuity**, and **Retention**.

---

### Reusable Grouping Logic

We want to develop a **reusable algorithm or query** that can be easily adapted for each tab’s specific requirements.

For example, in the **Quality** tab:

- The algorithm should identify **indices with ECS compatibility issues** (based on information from the *Data Quality Dashboard*).
- Once these faulty indices are identified, the algorithm should query each index to determine which log categories it contains.
- Based on that, the index should be assigned to one or more of the **five main log category groups**.
  - **Note:** An index can belong to **multiple categories** if it contains multiple types of logs.


## References
- 🎨 [Figma](https://www.figma.com/design/0Fy4vbvYQzHHqQm5U8dj5g/SIEM-Readiness?node-id=96-10311&p=f&t=HAmy9AqSemGZUVd8-0)
- 🗣️ [[Discuss] Logic for categorizing Non-Elastic Integration Logs](https://github.com/elastic/security-team/issues/14270?reload=1?reload=1#top)
- 📘 [[Epic] SIEM Readiness - Visibility- Log Coverage against Categories](https://github.com/elastic/security-team/issues/12475#top)
- 🏁 [[Epic] SIEM Readiness View - Milestone 1 MVP](https://github.com/elastic/security-team/issues/12470#top)




# First Investigation result

# **Category Grouping Investigation**

This investigation evaluates whether we can reliably group indices by document counts according to their `event.category` values. The goal is to understand how we can map those categories into the 5 main categories planned for the product: **Entity, Network, Cloud, App, Identity**.

---

## **1. Query Used**

This query searches all indices, aggregates by index, and then aggregates by `event.category`:

```json
GET /*/_search  
{  
  "size": 0,  
  "aggs": {  
    "by_index": {  
      "terms": { "field": "_index", "size": 1000 },  
      "aggs": {  
        "by_category": {  
          "terms": { "field": "event.category", "size": 10 }  
        }  
      }  
    }  
  }  
}  
```

The response structure looks like this:

```json
"aggregations": {  
  "by_index": {  
    "buckets": [  
      {  
        "key": "aws",  
        "by_category": {  
          "buckets": [  
            { "key": "network", "doc_count": 20 },  
            { "key": "cloud", "doc_count": 30000 }  
          ]  
        }  
      },  
      {  
        "key": "octa",  
        "by_category": {  
          "buckets": [  
            { "key": "network", "doc_count": 10 },  
            { "key": "identity", "doc_count": 2000 }  
          ]  
        }  
      }  
    ]  
  }  
}  
```

---

## **2. Grouping Function**

To convert the ES response into a flat category to indices map:

```js
const formatEsAggResponse = (resp) => {  
  const result = {};  
  for (const idxBucket of resp.aggregations.by_index.buckets) {  
    const index = idxBucket.key;  
    for (const catBucket of idxBucket.by_category.buckets) {  
      const category = catBucket.key;  
      const count = catBucket.doc_count;  
      if (!result[category]) result[category] = [];  
      result[category].push({ indexName: index, docs: count });  
    }  
  }  
  return result;  
}  
```

Running this against the `keep-long-live-env-ess` produced valid results, including indices that appear under multiple categories (for example: `.ds-logs-aws.cloudtrail-default-2025.11.05-000137`). This is expected, as many log sources (AWS CloudTrail included) naturally contain events from multiple semantic categories.

The query took ~5 seconds uncached, but with caching enabled it should be fast enough overall.

Here is the result of running this process over our keep alive env:

<details><summary><strong>Index Grouping By Category + Doc Count of Category</strong></summary>
<p>

```
{
  iam: [
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.05-000137',
      docs: 8771615
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.10.30-000134',
      docs: 8799813
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.03-000135',
      docs: 6159948
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.09-000139',
      docs: 4646951
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.04.02-000010',
      docs: 38
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.03.03-000009',
      docs: 194
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.07.31-000014',
      docs: 8
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.07.01-000013',
      docs: 6
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.06.01-000012',
      docs: 37
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.02.01-000008',
      docs: 84
    },
    {
      indexName: '.ds-logs-system.auth-default-2024.12.03-000006',
      docs: 83
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000016',
      docs: 193
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.01.02-000007',
      docs: 12
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000015',
      docs: 216
    },
    {
      indexName: '.internal.preview.alerts-security.alerts-default-000002',
      docs: 225
    },
    {
      indexName: '.internal.preview.alerts-security.alerts-default-000003',
      docs: 71
    }
  ],
  file: [
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.05-000137',
      docs: 5342531
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.10.30-000134',
      docs: 5042710
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.03-000135',
      docs: 12766707
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.09-000139',
      docs: 2696465
    },
    {
      indexName: '.ds-logs-endpoint.events.file-default-2025.03.21-000002',
      docs: 322536
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000009',
      docs: 116159
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000016',
      docs: 11356
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000015',
      docs: 5610
    },
    {
      indexName: '.ds-logs-auditd_manager.auditd-default-2025.03.21-000002',
      docs: 5
    },
    {
      indexName: '.internal.preview.alerts-security.alerts-default-000002',
      docs: 1876
    },
    {
      indexName: '.ds-logs-auditd_manager.auditd-default-2025.02.19-000001',
      docs: 3
    },
    {
      indexName: '.internal.preview.alerts-security.alerts-default-000003',
      docs: 1
    },
    {
      indexName: '.ds-logs-endpoint.events.file-default-2025.02.19-000001',
      docs: 176
    }
  ],
  network: [
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.05-000137',
      docs: 2973017
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.10.30-000134',
      docs: 3001441
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.03-000135',
      docs: 2071194
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.09-000139',
      docs: 1558897
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.10.02-000010',
      docs: 243742
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000009',
      docs: 2563
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.07.04-000007',
      docs: 170668
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.04.05-000004',
      docs: 161424
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.06.04-000006',
      docs: 140326
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.08.03-000008',
      docs: 120418
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.09.02-000009',
      docs: 109780
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.03.06-000003',
      docs: 105889
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.05.05-000005',
      docs: 104298
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.11.01-000011',
      docs: 77875
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000016',
      docs: 2069
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000015',
      docs: 520
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2024.12.13-000001',
      docs: 24603
    },
    {
      indexName: '.ds-logs-endpoint.events.network-default-2025.03.21-000002',
      docs: 13948
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.01.12-000002',
      docs: 4791
    },
    {
      indexName: '.ds-logs-auditd_manager.auditd-default-2025.03.21-000002',
      docs: 1
    },
    {
      indexName: '.internal.preview.alerts-security.alerts-default-000002',
      docs: 403
    },
    {
      indexName: '.ds-logs-auditd_manager.auditd-default-2025.02.19-000001',
      docs: 1
    },
    {
      indexName: '.internal.preview.alerts-security.alerts-default-000003',
      docs: 31
    }
  ],
  database: [
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.05-000137',
      docs: 772074
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.10.30-000134',
      docs: 788134
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.03-000135',
      docs: 543918
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.09-000139',
      docs: 404895
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000016',
      docs: 499
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000015',
      docs: 162
    },
    {
      indexName: '.internal.preview.alerts-security.alerts-default-000002',
      docs: 143
    },
    {
      indexName: '.internal.preview.alerts-security.alerts-default-000003',
      docs: 29
    }
  ],
  authentication: [
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.05-000137',
      docs: 724692
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.10.30-000134',
      docs: 625117
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.03-000135',
      docs: 470127
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.09-000139',
      docs: 403374
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.04.02-000010',
      docs: 227238
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.09.29-000016',
      docs: 328011
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.08.30-000015',
      docs: 218297
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.03.03-000009',
      docs: 210926
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.07.31-000014',
      docs: 123301
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.05.02-000011',
      docs: 181757
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.07.01-000013',
      docs: 105658
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.10.29-000017',
      docs: 169431
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.06.01-000012',
      docs: 164818
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000009',
      docs: 2
    },
    {
      indexName: '.ds-logs-system.auth-default-2024.10.23-000004',
      docs: 33938
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.02.01-000008',
      docs: 18606
    },
    {
      indexName: '.ds-logs-system.auth-default-2024.12.03-000006',
      docs: 13917
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000016',
      docs: 692
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.01.02-000007',
      docs: 10632
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000015',
      docs: 183
    },
    {
      indexName: '.ds-logs-system.auth-default-2024.07.25-000001',
      docs: 8689
    },
    {
      indexName: '.ds-logs-system.auth-default-2024.09.23-000003',
      docs: 8179
    },
    {
      indexName: '.ds-logs-system.auth-default-2024.08.24-000002',
      docs: 6963
    },
    {
      indexName: '.ds-logs-system.auth-default-2024.11.22-000005',
      docs: 3380
    },
    {
      indexName: '.ds-logs-auditd_manager.auditd-default-2025.03.21-000002',
      docs: 62
    },
    {
      indexName: '.internal.preview.alerts-security.alerts-default-000002',
      docs: 107
    },
    {
      indexName: '.ds-logs-auditd_manager.auditd-default-2025.02.19-000001',
      docs: 138
    },
    {
      indexName: '.internal.preview.alerts-security.alerts-default-000003',
      docs: 5
    }
  ],
  host: [
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.05-000137',
      docs: 379064
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.10.30-000134',
      docs: 357609
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.03-000135',
      docs: 250363
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.09-000139',
      docs: 202196
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000016',
      docs: 33
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000015',
      docs: 9
    },
    {
      indexName: '.ds-logs-auditd_manager.auditd-default-2025.03.21-000002',
      docs: 1
    },
    {
      indexName: '.internal.preview.alerts-security.alerts-default-000002',
      docs: 11
    }
  ],
  configuration: [
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.05-000137',
      docs: 77469
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.10.30-000134',
      docs: 80559
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.03-000135',
      docs: 55269
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.09-000139',
      docs: 40805
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.10.02-000010',
      docs: 243742
    },
    {
      indexName: '.ds-logs-cloud_security_posture.findings-default-2025.05.08-000015',
      docs: 197746
    },
    {
      indexName: '.ds-logs-cloud_security_posture.findings-default-2025.06.07-000018',
      docs: 186179
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000009',
      docs: 825
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.07.04-000007',
      docs: 170668
    },
    {
      indexName: '.ds-logs-cloud_security_posture.findings-default-2025.09.28-000025',
      docs: 169503
    },
    {
      indexName: '.ds-logs-cloud_security_posture.findings-default-2025.07.30-000021',
      docs: 168901
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.04.05-000004',
      docs: 161424
    },
    {
      indexName: '.ds-logs-cloud_security_posture.findings-default-2025.08.29-000023',
      docs: 157900
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.06.04-000006',
      docs: 140326
    },
    {
      indexName: '.ds-logs-cloud_security_posture.findings-default-2025.07.07-000020',
      docs: 130873
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.08.03-000008',
      docs: 120418
    },
    {
      indexName: '.ds-logs-cloud_security_posture.findings-default-2025.10.28-000027',
      docs: 119442
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.09.02-000009',
      docs: 109780
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.03.06-000003',
      docs: 105889
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.05.05-000005',
      docs: 104298
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.11.01-000011',
      docs: 77875
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000016',
      docs: 437
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000008',
      docs: 752
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000015',
      docs: 376
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000010',
      docs: 563
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000011',
      docs: 180
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2024.12.13-000001',
      docs: 24603
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000013',
      docs: 341
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000014',
      docs: 362
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000012',
      docs: 360
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.01.12-000002',
      docs: 4791
    },
    {
      indexName: '.ds-logs-auditd_manager.auditd-default-2025.03.21-000002',
      docs: 2
    },
    {
      indexName: '.internal.preview.alerts-security.alerts-default-000002',
      docs: 32
    },
    {
      indexName: 'logs-cloud_security_posture.findings_latest-default',
      docs: 2505
    },
    {
      indexName: 'security_solution-cloud_security_posture.misconfiguration_latest-v1',
      docs: 2386
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000017',
      docs: 24
    },
    {
      indexName: '.ds-logs-auditd_manager.auditd-default-2025.02.19-000001',
      docs: 2
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000007',
      docs: 434
    },
    {
      indexName: '.internal.preview.alerts-security.alerts-default-000003',
      docs: 4
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000006',
      docs: 241
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000005',
      docs: 207
    }
  ],
  api: [
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.05-000137',
      docs: 55900
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.10.30-000134',
      docs: 66146
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.03-000135',
      docs: 41919
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.09-000139',
      docs: 28195
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000016',
      docs: 56
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000015',
      docs: 27
    },
    {
      indexName: '.internal.preview.alerts-security.alerts-default-000002',
      docs: 7
    },
    {
      indexName: '.internal.preview.alerts-security.alerts-default-000003',
      docs: 7
    }
  ],
  package: [
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.05-000137',
      docs: 443
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.10.30-000134',
      docs: 405
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.03-000135',
      docs: 291
    },
    {
      indexName: '.ds-logs-aws.cloudtrail-default-2025.11.09-000139',
      docs: 243
    }
  ],
  vulnerability: [
    {
      indexName: '.ds-logs-cloud_security_posture.vulnerabilities-default-2025.09.28-000016',
      docs: 1970313
    },
    {
      indexName: '.ds-logs-cloud_security_posture.vulnerabilities-default-2025.08.29-000015',
      docs: 1859262
    },
    {
      indexName: '.ds-logs-cloud_security_posture.vulnerabilities-default-2025.07.30-000014',
      docs: 1775640
    },
    {
      indexName: '.ds-logs-cloud_security_posture.vulnerabilities-default-2025.10.28-000017',
      docs: 1549412
    },
    {
      indexName: '.ds-logs-cloud_security_posture.vulnerabilities-default-2025.03.04-000009',
      docs: 1490554
    },
    {
      indexName: '.ds-logs-cloud_security_posture.vulnerabilities-default-2025.07.02-000013',
      docs: 1463291
    },
    {
      indexName: '.ds-logs-cloud_security_posture.vulnerabilities-default-2025.05.03-000011',
      docs: 1459683
    },
    {
      indexName: '.ds-logs-cloud_security_posture.vulnerabilities-default-2025.06.02-000012',
      docs: 1451480
    },
    {
      indexName: '.ds-logs-cloud_security_posture.vulnerabilities-default-2025.04.03-000010',
      docs: 1418453
    },
    {
      indexName: '.ds-logs-cloud_security_posture.vulnerabilities-default-2025.02.02-000008',
      docs: 1400155
    },
    {
      indexName: '.ds-logs-cloud_security_posture.vulnerabilities-default-2025.01.03-000007',
      docs: 1219975
    },
    {
      indexName: '.ds-logs-cloud_security_posture.vulnerabilities-default-2024.12.04-000006',
      docs: 1149735
    },
    {
      indexName: '.ds-logs-cloud_security_posture.vulnerabilities-default-2024.10.23-000004',
      docs: 820089
    },
    {
      indexName: '.ds-logs-cloud_security_posture.vulnerabilities-default-2024.09.23-000003',
      docs: 340004
    },
    {
      indexName: '.ds-logs-cloud_security_posture.vulnerabilities-default-2024.07.25-000001',
      docs: 323449
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000009',
      docs: 741
    },
    {
      indexName: '.ds-logs-cloud_security_posture.vulnerabilities-default-2024.08.24-000002',
      docs: 129858
    },
    {
      indexName: '.ds-logs-cloud_security_posture.vulnerabilities-default-2024.11.22-000005',
      docs: 118810
    },
    {
      indexName: 'logs-cloud_security_posture.vulnerabilities_latest-default',
      docs: 102183
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000008',
      docs: 408
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000010',
      docs: 415
    },
    {
      indexName: '.internal.preview.alerts-security.alerts-default-000002',
      docs: 6
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000007',
      docs: 273
    }
  ],
  process: [
    {
      indexName: '.ds-logs-cloud_defend.process-default-2024.09.26-000003',
      docs: 1925868
    },
    {
      indexName: '.ds-logs-cloud_defend.process-default-2024.10.26-000004',
      docs: 1925486
    },
    {
      indexName: '.ds-logs-cloud_defend.process-default-2024.08.27-000002',
      docs: 1924930
    },
    {
      indexName: '.ds-logs-cloud_defend.process-default-2024.12.16-000006',
      docs: 1888873
    },
    {
      indexName: '.ds-logs-cloud_defend.process-default-2024.07.28-000001',
      docs: 1886247
    },
    {
      indexName: '.ds-logs-cloud_defend.process-default-2025.03.19-000009',
      docs: 1444716
    },
    {
      indexName: '.ds-logs-cloud_defend.process-default-2025.04.18-000010',
      docs: 1438728
    },
    {
      indexName: '.ds-logs-cloud_defend.process-default-2025.05.18-000011',
      docs: 1343644
    },
    {
      indexName: '.ds-logs-cloud_defend.process-default-2024.11.25-000005',
      docs: 1307911
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.04.02-000010',
      docs: 100
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.03.03-000009',
      docs: 50
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.07.01-000013',
      docs: 120
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.06.01-000012',
      docs: 2
    },
    {
      indexName: '.ds-logs-cloud_defend.process-default-2025.01.15-000007',
      docs: 306217
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000009',
      docs: 10803
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.02.01-000008',
      docs: 1
    },
    {
      indexName: '.ds-logs-system.auth-default-2024.12.03-000006',
      docs: 93
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.01.02-000007',
      docs: 3
    },
    {
      indexName: '.ds-logs-system.auth-default-2024.07.25-000001',
      docs: 26
    },
    {
      indexName: '.ds-logs-endpoint.events.process-default-2025.03.21-000002',
      docs: 13400
    },
    {
      indexName: '.ds-logs-auditd_manager.auditd-default-2025.03.21-000002',
      docs: 3566
    },
    {
      indexName: '.ds-logs-auditd_manager.auditd-default-2025.02.19-000001',
      docs: 1035
    },
    {
      indexName: '.ds-logs-endpoint.events.process-default-2025.02.19-000001',
      docs: 233
    }
  ],
  session: [
    {
      indexName: '.ds-logs-system.auth-default-2025.04.02-000010',
      docs: 49439
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.09.29-000016',
      docs: 26872
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.08.30-000015',
      docs: 26898
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.03.03-000009',
      docs: 53010
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.07.31-000014',
      docs: 26874
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.05.02-000011',
      docs: 26896
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.07.01-000013',
      docs: 26940
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.10.29-000017',
      docs: 18928
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.06.01-000012',
      docs: 29221
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.10.02-000010',
      docs: 3055
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000009',
      docs: 51061
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.07.04-000007',
      docs: 4605
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.04.05-000004',
      docs: 4563
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.06.04-000006',
      docs: 3287
    },
    {
      indexName: '.ds-logs-system.auth-default-2024.10.23-000004',
      docs: 3112
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.08.03-000008',
      docs: 3606
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.09.02-000009',
      docs: 2669
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.03.06-000003',
      docs: 2994
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.05.05-000005',
      docs: 2587
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.11.01-000011',
      docs: 1815
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.02.01-000008',
      docs: 13468
    },
    {
      indexName: '.ds-logs-system.auth-default-2024.12.03-000006',
      docs: 4050
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000016',
      docs: 23726
    },
    {
      indexName: '.ds-logs-system.auth-default-2025.01.02-000007',
      docs: 6289
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000008',
      docs: 32846
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000015',
      docs: 23718
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000010',
      docs: 27424
    },
    {
      indexName: '.ds-logs-system.auth-default-2024.07.25-000001',
      docs: 3109
    },
    {
      indexName: '.ds-logs-system.auth-default-2024.09.23-000003',
      docs: 3156
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000011',
      docs: 25173
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2024.12.13-000001',
      docs: 378
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000013',
      docs: 23768
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000014',
      docs: 23722
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000012',
      docs: 23745
    },
    {
      indexName: '.ds-logs-system.auth-default-2024.08.24-000002',
      docs: 3164
    },
    {
      indexName: '.ds-logs-system.auth-default-2024.11.22-000005',
      docs: 1168
    },
    {
      indexName: '.ds-logs-gcp.audit-default-2025.01.12-000002',
      docs: 7
    },
    {
      indexName: '.ds-logs-auditd_manager.auditd-default-2025.03.21-000002',
      docs: 9
    },
    {
      indexName: '.internal.alerts-security.alerts-default-000017',
      docs: 1548
    },
    {
      indexName: '.ds-logs-auditd_manager.auditd-default-2025.02.19-000001',
      docs: 7
    }
  ],
  unknown: [
    {
      indexName: '.ds-logs-auditd_manager.auditd-default-2025.03.21-000002',
      docs: 99
    },
    {
      indexName: '.ds-logs-auditd_manager.auditd-default-2025.02.19-000001',
      docs: 167
    }
  ]
}
```
</p>
</details> 

---

## **3. Mapping `event.category` to The 5 Main Categories**

Below is a proposed mapping table based on ECS guidelines and SIEM conventions. This table supports the next step of grouping categories into the 5 main buckets.

### **Proposed Mapping Table**

| ECS Category            | Main Category     | Notes |
|-------------------------|-------------------|-------|
| authentication          | Identity          | login events |
| iam                     | Identity          | cloud IAM actions |
| session                 | Identity          | Okta / auth sessions |
| user                    | Identity          | user-related activities |
| network                 | Network           | network flow logs |
| firewall                | Network           | firewalls / NGFW |
| intrusion_detection     | Network           | IDS/IPS |
| dns                     | Network           | DNS queries |
| cloud                   | Cloud             | cloud resource activity |
| application             | App               | service/app logs |
| web                     | App               | web servers / proxies |
| database                | App               | DB logs |
| package                 | App               | software packages |
| endpoint                | Entity            | host/device activity |
| file                    | Entity            | file operations |
| process                 | Entity            | process creation |
| registry                | Entity            | Windows registry |
| malware                 | Entity            | malware/EDR logs |
| driver                  | Entity            | OS drivers |
| configuration           | Cloud or App      | ambiguous, depends on source |
| threat                  | Entity / Multi    | threat events span multiple layers |

### **Notes**

- Some indices logically fit multiple buckets. For example, `cloudtrail` includes identity, network, and cloud operations.
- The grouping method should **not** force a single category per index - multi-category membership is expected and correct.

---

## **4. Mapping Function to the Main Categories**

A simple function to apply the mapping (useful for post-processing the aggregation output):

```js
const categoryMap = {  
  authentication: "Identity",  
  iam: "Identity",  
  session: "Identity",  
  user: "Identity",  
  network: "Network",  
  firewall: "Network",  
  intrusion_detection: "Network",  
  dns: "Network",  
  cloud: "Cloud",  
  application: "App",  
  web: "App",  
  database: "App",  
  package: "App",  
  endpoint: "Entity",  
  file: "Entity",  
  process: "Entity",  
  registry: "Entity",  
  malware: "Entity",  
  driver: "Entity"  
};  

const formatToMainCategories = (resp) => {  
  const result = {};  
  for (const idxBucket of resp.aggregations.by_index.buckets) {  
    const index = idxBucket.key;  
    for (const catBucket of idxBucket.by_category.buckets) {  
      const subCategory = catBucket.key;  
      const mainCat = categoryMap[subCategory];  
      if (!mainCat) continue;  
      if (!result[mainCat]) result[mainCat] = [];  
      result[mainCat].push({ indexName: index, docs: catBucket.doc_count });  
    }  
  }  
  return result;  
}  
```

---

## **5. Performance Considerations**

Aggregating across all indices can be expensive, especially with large retention windows. possible improvement would be to filter by time range:

```
"query": {  
  "range": {  
    "@timestamp": { "gte": "now-7d" }  
  }  
}  
```
