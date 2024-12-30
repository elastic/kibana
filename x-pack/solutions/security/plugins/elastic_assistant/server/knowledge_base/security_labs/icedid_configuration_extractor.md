---
title: "ICEDID Configuration Extractor"
slug: "icedid-configuration-extractor"
date: "2022-12-06"
subtitle: "Configuration extraction tool for ICEDID malware."
description: "Python script to extract the configuration from ICEDID samples."
author:
  - slug: elastic-security-labs
image: "tools-image.jpg"
category:
  - slug: tools
tags:
  - icedid
  - ref1021
---

Python script to extract the payload from ICEDID samples.

[Download icedid-configuration-extractor.tar.gz](https://assets.contentstack.io/v3/assets/bltefdd0b53724fa2ce/blt95ce19ae8cffda29/6351abcf20f42038fb989fae/icedid-config-extractor.tar.gz)

> For information on the ICEDID malware and network infrastructure, check out the following resources:
>
> - [ICEDIDs network infrastructure is alive and well](https://www.elastic.co/security-labs/icedids-network-infrastructure-is-alive-and-well)
> - [ICEDID network infrastructure checking utility](https://assets.contentstack.io/v3/assets/bltefdd0b53724fa2ce/bltb86bffd1aef20c5b/6351aba34e565f1cdce29da5/icedid-checker.tar.gz)

## Getting started

### Docker

The recommended and easiest way to get going is to use Docker. From the directory this README is in, you can build a local container.

```
docker build . -t icedid_loader_config_extractor
```

Then we run the container with the -v flag to map a host directory to the docker container directory.

```
docker run -ti --rm -v $(pwd)/data:/data icedid_loader_config_extractor:latest --help
```

### Running it locally

As mentioned above, Docker is the recommended approach to running this project, however you can also run this locally. This project uses [Poetry](https://python-poetry.org/) to manage dependencies, testing, and metadata. If you have Poetry installed already, from this directory, you can simply run the following commands to run the tool. This will setup a virtual environment, install the dependencies, activate the virtual environment, and run the console script.

```
poetry lock
poetry install
poetry shell
poetry lock
poetry install
poetry shell
icedid_loader_config_extractor --help
```

## Usage

All samples need to be unpacked prior to execution extraction attempts.

We can either specify a single sample with **-f** option or a directory of samples with **-d**.

```
docker run -ti --rm -v $(pwd)/data:/data icedid_loader_config_extractor:latest -d "C:\tmp\samples"
```

![ICEDID configuration extractor](/assets/images/icedid-configuration-extractor/196841115-5a3a0d95-8df4-45c2-9baa-264cfa9530e9.jpg)

You can collect the extracted configurations from the directory you set when running the extractor.
