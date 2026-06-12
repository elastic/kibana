---
title: "NETWIRE Configuration Extractor"
slug: "netwire-configuration-extractor"
date: "2023-01-27"
subtitle: "Configuration extraction tool for the NETWIRE malware."
description: "Python script to extract the configuration from NETWIRE samples."
author:
  - slug: elastic-security-labs
image: "tools-image.jpg"
category:
  - slug: tools
tags:
  - netwire
  - ref9965
---

Python script to extract the payload from NETWIRE samples.

[Download netwire-configuration-extractor.tar.gz](https://assets.contentstack.io/v3/assets/bltefdd0b53724fa2ce/bltdcef1d05d2077d05/63d43627c31a7126813ff8b6/netwire-configuration-extractor.tar.gz)

> For information on the NETWIRE malware check out the following resources:
>
> - [NETWIRE Dynamic Configuration Extraction](https://www.elastic.co/security-labs/netwire-dynamic-configuration-extraction)

## Getting started

### Docker

The recommended and easiest way to get going is to use Docker. From the directory this README is in, you can build a local container.

```
docker build . -t netwire_loader_config_extractor
```

Then we run the container with the **-v** flag to map a host directory to the docker container directory.

```
docker run -ti --rm -v $(pwd)/data:/data netwire_loader_config_extractor:latest --help
```

### Running it locally

As mentioned above, Docker is the recommended approach to running this project, however you can also run this locally. This project uses [Poetry](https://python-poetry.org/) to manage dependencies, testing, and metadata. If you have Poetry installed already, from this directory, you can simply run the following commands to run the tool. This will setup a virtual environment, install the dependencies, activate the virtual environment, and run the console script.

```
poetry lock
poetry install
poetry shell
netwire-config-extractor --help
```

## Usage

All samples need to be unpacked prior to execution extraction attempts.

Our extractor takes either a directory of samples with **-d** option or **-f** for a single sample and then can output parts of the configuration of note, specifically:

- **-k** : extract the encryption keys
- **-c** : extract the C2 information
- **-s** : extract the wide-character strings
- **-a** : extract the ASCII character strings

```
docker run -ti --rm -v $(pwd)/data:/data netwire_loader_config_extractor:latest -d "C:\tmp\samples"
```

![NETWIRE configuration extractor](/assets/images/netwire-configuration-extractor/image6.jpg)

You can collect the extracted configurations from the directory you set when running the extractor.
