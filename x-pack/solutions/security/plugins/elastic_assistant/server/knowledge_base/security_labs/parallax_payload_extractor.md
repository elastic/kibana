---
title: "PARALLAX Payload Extractor"
slug: "parallax-payload-extractor"
date: "2022-12-06"
description: "Python script to extract the payload from PARALLAX samples."
author:
  - slug: elastic-security-labs
image: "tools-image.jpg"
category:
  - slug: tools
tags:
  - parallax
  - ref2731
---

Python script to extract the payload from PARALLAX samples.

[Download parallax-payload-extractor.tar.gz](https://assets.contentstack.io/v3/assets/bltefdd0b53724fa2ce/bltdcec03c5c91923f5/633613d524bebb2394c2773d/parallax-payload-extractor.tar.gz)

> For information on the PARALLAX malware loader and campaign observations, check out our [blog posts](https://elastic.co/security-labs/exploring-the-ref2731-intrusion-set) detailing this intrusion set.

## Getting started

### Docker

The recommended and easiest way to get going is to use Docker. From the directory this README is in, you can build a local container.

```
docker build . -t parallax_loader_payload_extractor
```

Then we run the container with the -v flag to map a host directory to the docker container directory.

```
docker run -ti --rm -v $(pwd)/data:/data parallax_loader_payload_extractor:latest --help
```

### Running it locally

As mentioned above, Docker is the recommended approach to running this project, however you can also run this locally. This project uses [Poetry](https://python-poetry.org/) to manage dependencies, testing, and metadata. If you have Poetry installed already, from this directory, you can simply run the following commands to run the tool. This will setup a virtual environment, install the dependencies, activate the virtual environment, and run the console script.

```
poetry lock
poetry install
poetry shell
parallax_loader_payload_extractor --help
```

## Usage

We can either specify a single sample with **-f** option or a directory of samples with **-d**. You can use the -o switch to set the output directory of the payloads.

```
docker run -ti --rm -v $(pwd)/data:/data parallax_loader_payload_extractor:latest -d /data -o /data
```

![PARALLAX payload extractor](/assets/images/parallax-payload-extractor/image41.jpg)

You can collect the extracted payloads from the directory you set when running the extractor, the data directory in the root of the extractor in the above example.
