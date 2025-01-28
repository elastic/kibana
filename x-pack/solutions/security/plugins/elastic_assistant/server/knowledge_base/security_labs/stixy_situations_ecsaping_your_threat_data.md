---
title: "STIXy Situations: ECSaping your threat data"
subtitle: "Structured threat data is commonly formatted using STIX. To help get this data into Elasticsearch, we’re releasing a Python script that converts STIX to an ECS format to be ingested into your stack."
slug: "stixy-situations-ecsaping-your-threat-data"
date: "2024-02-09"
description: "Structured threat data is commonly formatted using STIX. To help get this data into Elasticsearch, we’re releasing a Python script that converts STIX to an ECS format to be ingested into your stack."
author:
  - slug: cyril-francois
  - slug: andrew-pease
image: "photo-edited-07@2x.jpg"
category:
  - slug: tools
---

## Preamble
Organizations that use threat indicators or observables consume, create, and/or (ideally) publish threat data. This data can be used internally or externally as information or intelligence to inform decision-making and event prioritization.

While there are several formats for this information to be structured into, the de facto industry standard is [Structured Threat Information Expression (STIX)](https://oasis-open.github.io/cti-documentation/stix/intro). STIX is managed by the [OASIS Cyber Threat Intelligence Technical Committee](https://www.oasis-open.org/committees/tc_home.php?wg_abbrev=cti) and enables organizations to share threat data in a standard and machine-readable format.

At Elastic, we developed the [Elastic Common Schema (ECS)](https://www.elastic.co/guide/en/ecs/current/ecs-reference.html) as a data normalization capability. “[ECS] is an open source specification, developed with support from the Elastic user community. ECS defines a common set of fields for storing event data in Elasticsearch, such as logs and metrics.” In April of 2023, [Elastic contributed ECS](https://www.elastic.co/blog/ecs-elastic-common-schema-otel-opentelemetry-announcement) to the [OpenTelemetry Semantic Conventions (OTel)](https://opentelemetry.io/docs/concepts/semantic-conventions/) as a commitment to the joint development of an open schema. 

The security community shares threat data in the STIX format, so to store that data in Elasticsearch for analysis and threat detection [[1](https://www.elastic.co/guide/en/security/current/threat-intel-hash-indicator-match.html)] [[2](https://www.elastic.co/guide/en/security/current/threat-intel-ip-address-indicator-match.html)] [[3](https://www.elastic.co/guide/en/security/current/threat-intel-url-indicator-match.html)] [[4](https://www.elastic.co/guide/en/security/current/threat-intel-windows-registry-indicator-match.html)], we created a tool that converts STIX documents into ECS and outputs the threat data either as a file or directly into Elasticsearch indices. If this was a challenge for us, it was a challenge for others - therefore, we decided to release a version of the tool.

This tool uses the [Elastic License 2.0](https://www.elastic.co/licensing/elastic-license) and is available for download [here](https://github.com/elastic/labs-releases/tree/main/tools/stix-to-ecs).

## Getting started
This project will take a STIX 2.x formatted JSON document and create an ECS version. There are three output options: STDOUT as JSON, an NDJSON file, and/or directly to an Elasticsearch cluster.

### Prerequisites
The STIX 2 ECS project requires Python 3.10+ and the [stix2](https://pypi.org/project/stix2/), [Elasticsearch](https://pypi.org/project/elasticsearch/), and [getpass](https://pypi.org/project/getpass4/) modules.

If exporting to Elasticsearch, you will need the host information and authentication credentials. API authentication is not yet implemented.

### Setup
Create a virtual environment and install the required prerequisites.

```
git clone https://github.com/elastic/labs-releases.git
cd tools/stix2ecs
python -m venv /path/to/virtual/environments/stix2ecs
source /path/to/virtual/environments/stix2ecs/bin/activate
python -m pip install -r requirements.txt
```

## Operation
The input is a STIX 2.x JSON document (or a folder of JSON documents); the output defaults to STDOUT, with an option to create an NDJSON file and/or send to an Elasticsearch cluster.

```
stix_to_ecs.py [-h] -i INPUT [-o OUTPUT] [-e] [--index INDEX] [--url URL] \
[--user USER] [-p PROVIDER] [-r]
```

By default, the ECS file is named the same as the STIX file input but with `.ecs.ndjson` appended.

### Arguments
The script has several arguments, the only mandatory field is `-i` for the input. By default, the script will output the NDJSON document to STDOUT.

| Option | Description |
| - | - |
| -h | displays the help menu |
| -i | specifies the input STIX document (mandatory) |
| -o | specifies the output ECS document (optional) |
| -p | defines the ECS provider field (optional) |
| -r | recursive mode to convert multiple STIX documents (optional) |
| -e | specifies the Elasticsearch output mode (optional) |
| --index | defines the Elasticsearch Index, requires `-e` (optional) |
| --url | defines the Elasticsearch URL, requires `-e` (optional) |
| --user | defines the Elasticsearch username, requires `-e` (optional) |

## Examples
There are two sample files located in the `test-inputs/` directory. One is from [CISA](https://www.cisa.gov/topics/cyber-threats-and-advisories/information-sharing/automated-indicator-sharing-ais) (Cybersecurity & Infrastructure Security Agency), and one is from [OpenCTI](https://github.com/OpenCTI-Platform/opencti) (an open source threat intelligence platform).

### STIX file input to STDOUT
This will output the STIX document to STDOUT in ECS format.

```
python stix_to_ecs.py -i test-inputs/cisa_sample_stix.json | jq

[
  {
    "threat": {
      "indicator": {
        "file": {
          "name": "123.ps1",
          "hash": {
            "sha256": "ED5D694D561C97B4D70EFE934936286FE562ADDF7D6836F795B336D9791A5C44"
          }
        },
        "type": "file",
        "description": "Simple indicator of observable {ED5D694D561C97B4D70EFE934936286FE562ADDF7D6836F795B336D9791A5C44}",
        "first_seen": "2023-11-21T18:57:25.000Z",
        "provider": "identity--b3bca3c2-1f3d-4b54-b44f-dac42c3a8f01",
        "modified_at": "2023-11-21T18:57:25.000Z",
        "marking": {
          "tlp": "clear"
        }
      }
    }
  },
...
```

### STIX file input to ECS file output
This will create a folder called `ecs` in the present directory and write the ECS file there.

```
python python stix_to_ecs.py -i test-inputs/cisa_sample_stix.json -o ecs

cat ecs/cisa_sample_stix.ecs.ndjson | jq
{
  "threat": {
    "indicator": {
      "file": {
        "name": "123.ps1",
        "hash": {
          "sha256": "ED5D694D561C97B4D70EFE934936286FE562ADDF7D6836F795B336D9791A5C44"
        }
      },
      "type": "file",
      "description": "Simple indicator of observable {ED5D694D561C97B4D70EFE934936286FE562ADDF7D6836F795B336D9791A5C44}",
      "first_seen": "2023-11-21T18:57:25.000Z",
      "provider": "identity--b3bca3c2-1f3d-4b54-b44f-dac42c3a8f01",
      "modified_at": "2023-11-21T18:57:25.000Z",
      "marking": {
        "tlp": "clear"
      }
    }
  }
}
...
```

### STIX file input to ECS file output, defining the Provider field
The provider field is commonly a GUID in the STIX document. To make it more user-friendly, you can use the `-p` argument to define the `threat.indicator.provider` field.

```
python stix_to_ecs.py -i test-inputs/cisa_sample_stix.json -o ecs -p "Elastic Security Labs"

cat ecs/cisa_sample_stix.ecs.ndjson | jq
{
  "threat": {
    "indicator": {
      "file": {
        "name": "123.ps1",
        "hash": {
          "sha256": "ED5D694D561C97B4D70EFE934936286FE562ADDF7D6836F795B336D9791A5C44"
        }
      },
      "type": "file",
      "description": "Simple indicator of observable {ED5D694D561C97B4D70EFE934936286FE562ADDF7D6836F795B336D9791A5C44}",
      "first_seen": "2023-11-21T18:57:25.000Z",
      "provider": "Elastic Security Labs",
      "modified_at": "2023-11-21T18:57:25.000Z",
      "marking": {
        "tlp": "clear"
      }
    }
  }
}
...
```

### STIX directory input to ECS file outputs
If you have a directory of STIX documents, you can use the `-r` argument to recursively search through the directory and write the ECS documents to the output directory.

```
python stix_to_ecs.py -ri test-inputs -o ecs
```

### STIX file input to Elasticsearch output
To output to Elasticsearch, you can use either Elastic Cloud or a local instance. Local Elasticsearch will use port `9200` and Elastic Cloud will use port `443`. By default, a valid TLS session to Elasticsearch is required.

First, create an index if you don't already have one. In this example, we’re creating an index called `stix2ecs`, but the index name isn’t relevant.

```
curl -u {username} -X PUT "https://elasticsearch:port/stix2ecs?pretty"

{
  "acknowledged" : true,
  "shards_acknowledged" : true,
  "index" : "stix2ecs"
}
```

Next, define the Elasticsearch output options.

```
python stix_to_ecs.py -i test-inputs/cisa_sample_stix.json -e --url https://elasticsearch:port --user username --index stix2ecs
```

If you’re storing the data in Elasticsearch for use in another platform, you can view the indicators using cURL.

```
curl -u {username} https://elasticsearch:port/stix2ecs/_search?pretty

{
  "took" : 2,
  "timed_out" : false,
  "_shards" : {
    "total" : 1,
    "successful" : 1,
    "skipped" : 0,
    "failed" : 0
  },
  "hits" : {
    "total" : {
      "value" : 3,
      "relation" : "eq"
    },
    "max_score" : 1.0,
    "hits" : [
      {
        "_index" : "stix2ecs",
        "_id" : "n2lt8IwBahlUtp0hzm9i",
        "_score" : 1.0,
        "_source" : {
          "threat" : {
            "indicator" : {
              "file" : {
                "name" : "123.ps1",
                "hash" : {
                  "sha256" : "ED5D694D561C97B4D70EFE934936286FE562ADDF7D6836F795B336D9791A5C44"
                }
              },
              "type" : "file",
              "description" : "Simple indicator of observable {ED5D694D561C97B4D70EFE934936286FE562ADDF7D6836F795B336D9791A5C44}",
              "first_seen" : "2023-11-21T18:57:25.000Z",
              "provider" : "identity--b3bca3c2-1f3d-4b54-b44f-dac42c3a8f01",
              "modified_at" : "2023-11-21T18:57:25.000Z",
              "marking" : {
                "tlp" : "clear"
              }
            }
          }
        }
      }
...
```

If you’re using Kibana, you can [create a Data View](https://www.elastic.co/guide/en/kibana/current/data-views.html) for your `stix2ecs` index to view the ingested indicators. 

![STIX2ECS data in Kibana](/assets/images/stixy-situations-ecsaping-your-threat-data/image1.png "STIX2ECS data in Kibana")


Finally, you can use this as an indicator source for [Indicator Match rules](https://www.elastic.co/guide/en/security/current/prebuilt-rule-1-0-2-threat-intel-indicator-match.html).

![Indicator Match rule created with STIX2ECS data](/assets/images/stixy-situations-ecsaping-your-threat-data/image2.png "Indicator Match rule created with STIX2ECS data")


## Summary
We hope this project helps your organization analyze and operationalize your threat data. If you’re new to the Elastic Common Schema, you can learn more about that [here](https://www.elastic.co/guide/en/ecs/current/index.html). 

As always, please feel free to open an [issue](https://github.com/elastic/labs-releases/issues) with any questions, comments, concerns, or complaints. 

## About Elastic Security Labs
Elastic Security Labs is the threat intelligence branch of Elastic Security dedicated to creating positive change in the threat landscape. Elastic Security Labs provides publicly available research on emerging threats with an analysis of strategic, operational, and tactical adversary objectives, then integrates that research with the built-in detection and response capabilities of Elastic Security.

Follow Elastic Security Labs on Twitter [@elasticseclabs](https://twitter.com/elasticseclabs?ref_src=twsrc%5Egoogle%7Ctwcamp%5Eserp%7Ctwgr%5Eauthor) and check out our research at [www.elastic.co/security-labs/](https://www.elastic.co/security-labs/). 
