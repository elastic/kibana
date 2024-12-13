---
title: "Unpacking ICEDID"
slug: "unpacking-icedid"
date: "2023-05-04"
subtitle: "A comprehensive tutorial with Elastic Security Labs open source tools"
description: "ICEDID is known to pack its payloads using custom file formats and a custom encryption scheme. We are releasing a set of tools to automate the unpacking process and help analysts and the community respond to ICEDID."
author:
  - slug: cyril-francois
image: "photo-edited-07@2x.jpg"
category:
  - slug: tools
tags:
  - icedid
---

## Preamble

ICEDID is a malware family [discovered](https://securityintelligence.com/new-banking-trojan-icedid-discovered-by-ibm-x-force-research/)in 2017 by IBM X-force researchers and is associated with the theft of login credentials, banking information, and other personal information. ICEDID has always been a prevalent family but achieved even more growth since EMOTET’s temporary [disruption](https://www.justice.gov/opa/pr/emotet-botnet-disrupted-international-cyber-operation) in early 2021. ICEDID has been linked to the distribution of several distinct malware families including [DarkVNC](https://malpedia.caad.fkie.fraunhofer.de/details/win.darkvnc) and [COBALT STRIKE](https://www.cybereason.com/blog/threat-analysis-report-all-paths-lead-to-cobalt-strike-icedid-emotet-and-qbot). Regular industry reporting, including research publications like this one, help mitigate this threat.

ICEDID is known to pack its payloads using custom file formats and a custom encryption scheme. Following our latest [ICEDID research](https://www.elastic.co/security-labs/thawing-the-permafrost-of-icedid-summary) that covers the GZip variant execution chain.

In this tutorial, we will introduce these tools by unpacking a recent ICEDID sample starting with downloading a copy of the fake GZip binary:

**Analyzing malware can be dangerous to systems and should only be attempted by experienced professionals in a controlled environment, like an isolated virtual machine or analysis sandbox. Malware can be designed to evade detection and infect other systems, so it's important to take all necessary precautions and use specialized tools to protect yourself and your systems.**

[**54d064799115f302a66220b3d0920c1158608a5ba76277666c4ac532b53e855f**](https://bazaar.abuse.ch/sample/54d064799115f302a66220b3d0920c1158608a5ba76277666c4ac532b53e855f/)

## Environment setup

For this tutorial, we’re using Windows 10 and Python 3.10.

Elastic Security Labs is releasing a set of tools to automate the unpacking process and help analysts and the community respond to ICEDID.

| Script                                    | Description                                                      | Compatibility                   |
| ----------------------------------------- | ---------------------------------------------------------------- | ------------------------------- |
| decrypt_file.py                           | Decrypt ICEDID encrypted file                                    | Windows and others (not tested) |
| gzip_variant/extract_gzip.py              | Extract payloads from ICEDID fake GZip file                      | Windows and others (not tested) |
| gzip_variant/extract_payload_from_core.py | Extract and decrypt payloads from the rebuilt ICEDID core binary | Windows and others (not tested) |
| gzip_variant/load_core.py                 | Load and execute core custom PE binary                           | Windows only                    |
| gzip_variant/read_configuration.py        | Read ICEDID configuration file contained in the fake GZip        | Windows and others (not tested) |
| rebuild_pe.py                             | Rebuild a PE from ICEDID custom PE file                          | Windows and others (not tested) |

In order to use the tools, clone the [Elastic Security Lab release repository](https://github.com/elastic/labs-releases) and install the nightMARE module.

```
git clone https://github.com/elastic/labs-releases
cd labs-release
pip install .\nightMARE\
```

> All tools in this tutorial use the **nightMARE** module, this library implements different algorithms we need for unpacking the various payloads embedded within ICEDID. We’re releasing nightMARE because it is required for this ICEDID analysis, but stay tuned - more to come as we continue to develop and mature this framework.

## Unpacking the fake GZip

The ICEDID fake GZip is a file that [masquerades](https://attack.mitre.org/techniques/T1036/008/) as a valid GZip file formatted by encapsulating the real data with a [GZip header and footer](https://docs.fileformat.com/compression/gz/).

![GZip header and footer](/assets/images/unpacking-icedid/image20.jpg)

GZip magic bytes appear in red.  
The GZip header is rendered in green.  
The dummy filename value is blue.

After the GZip header is the true data structure, which we describe below.

![FakeGzip data structure](/assets/images/unpacking-icedid/image19.jpg)

We will use the **labs-releases\tools\icedid\gzip-variant\extract_gzip.py** script to unpack this fraudulent GZip.

```
usage: extract_gzip.py [--help] input output

positional arguments:
  input       Input file
  output      Output directory

options:
  -h, --help  show this help message and exit
```

We'll use extract_gzip.py on the ICEDID sample linked above and store the contents into a folder we created called “ **extract** ” (you can use any existing output folder).

```
python extract_gzip.py 54d064799115f302a66220b3d0920c1158608a5ba76277666c4ac532b53e855f extract

============================================================
Fake Gzip
============================================================
is_dll: True
core: UponBetter/license.dat (354282 bytes)
stage_2: lake_x32.tmp (292352 bytes)

extract\configuration.bin
extract\license.dat
extract\lake_x32.tmp
```

This script returns three individual files consisting of:

- The encrypted configuration file: **configuration.bin**
- The encrypted core binary: **license.dat**
- The persistence loader: **lake_x32.tmp**

![Files extracted from the fake GZip](/assets/images/unpacking-icedid/image11.jpg)

## Decrypting the core binary and configuration files

The configuration and the core binary we extracted are encrypted using ICEDID’s custom encryption scheme. We can decrypt them with the **labs-releases\tools\icedid\decrypt_file.py** script.

```
usage: decompress_file.py [--help] input output

positional arguments:
  input       Input file
  output      Output file

options:
  -h, --help  show this help message and exit
```

As depicted here (note that decrypted files can be written to any valid destination):

```
python .\decrypt_file.py .\extract\license.dat .\extract\license.dat.decrypted

python .\decrypt_file.py .\extract\configuration.bin .\extract\configuration.bin.decrypted
```

The core binary and the configuration are now ready to be processed by additional tools. See the data from the decrypted configuration presented in the following screenshot:

![Hex view of the decrypted configuration file](/assets/images/unpacking-icedid/image17.jpg)

## Reading the configuration

The configuration file format is presented below.

![Configuration file](/assets/images/unpacking-icedid/image4.png)

The configuration can be read using the **labs-releases\tools\icedid\gzip-variant\read_configuration.py** script.

```
usage: read_configuration.py [--help] input

positional arguments:
  input       Input file

options:
  -h, --help  show this help message and exit
```

We’ll use the **read_configuration.py** script to read the **configuration.bin.decrypted** file we collected in the previous step.

```
python .\gzip-variant\read_configuration.py .\extract\configuration.bin.decrypted

============================================================
Configuration
============================================================
botnet_id: 0x3B7D6BA4
auth_var: 0x00000038
uri: /news/
domains:
        alishaskainz.com
        villageskaier.com
```

This configuration contains two C2 domains:

- alishaskainz[.]com
- villageskaier[.]com

For this sample, the beaconing URI that ICEDID uses is “ **/news/** ”.

## Rebuilding the core binary for static analysis

ICEDID uses a custom PE format to obfuscate its payloads thus defeating static or dynamic analysis tools that expect to deal with a normal Windows executable. The custom PE file format is described below.

![Custom PE file format](/assets/images/unpacking-icedid/image8.jpg)

If we want to analyze the core binary, for example with [IDA Pro](https://hex-rays.com/IDA-pro/), we need to rebuild it into a valid PE. We use the **labs-releases\tools\icedid\rebuild_pe.py** script.

```
usage: rebuild_pe.py [--help] [-o OFFSET] input output

positional arguments:
  input                 Input file
  output                Output reconstructed PE

options:
  -h, --help            show this help message and exit
  -o OFFSET, --offset OFFSET
                        Offset to real data, skip possible garbage
```

However, when attempting to use **rebuild_pe.py** on the decrypted core binary, **license.dat.decrypted** , we receive the following error message:

```
python .\rebuild_pe.py .\extract\license.dat.decrypted .\extract\core.bin
Traceback (most recent call last):
  File "rebuild_pe.py", line 32, in <module>
    main()
  File "rebuild_pe.py", line 28, in main
    custom_pe.CustomPE(data).to_pe().write(args.output)
  File "nightmare\malware\icedid\custom_pe.py", line 86, in __init__
    raise RuntimeError("Failed to parse custom pe")
RuntimeError: Failed to parse custom pe
```

The subtlety here is that the custom PE data doesn’t always start at the beginning of the file. In this case, for example, if we open the file in a hexadecimal editor like [HxD](https://mh-nexus.de/en/hxd/) we can observe a certain amount of garbage bytes before the actual data.

![Prepended garbage bytes](/assets/images/unpacking-icedid/image14.jpg)

We know from our research that the size of the garbage is **129** bytes.

![Identifying garbage size](/assets/images/unpacking-icedid/image1.jpg)

With that in mind, we can skip over the garbage bytes and rebuild the core binary using the **rebuild_pe.py** script using the **“-o 129”** parameter. This time we, fortunately, receive no error message. **core.bin** will be saved to the output directory, **extract** in our example.

```
python .\rebuild_pe.py .\extract\license.dat.decrypted .\extract\core.bin -o 129
```

The rebuilt PE object is **not** directly executable but you can statically analyze it using your disassembler of choice.

![IDA view of core.bin](/assets/images/unpacking-icedid/image5.jpg)

We assigned custom names to the rebuilt binary sections ( **.mare\{0,1,2,...\}** ).

![Rebuilt binary section names](/assets/images/unpacking-icedid/image7.jpg)

We want to credit and thank [Hasherezade’s work](https://github.com/hasherezade/funky_malware_formats/blob/f1cacba4ee347601dceacda04e4de8c699971d29/iced_id_parser/iceid_to_pe.cpp#L10) from which we took inspiration to build this tool.

## Executing the core binary (Windows only)

The core binary can’t be executed without a custom loader that understands ICEDID’s custom PE format as well as the entry point function prototype.

From our research, we know that the entry point expects a structure we refer to as the context structure, which contains ICEDID core and persistence loader paths with its encrypted configuration. The context structure is described below.

![Context structure](/assets/images/unpacking-icedid/image2.jpg)

To natively execute the core binary we use the **labs-releases\tools\icedid\gzip-variant\load_core.py** script, but before using it we need to create the **context.json** file that’ll contain all the information needed by this script to build this structure.

For this sample, we copy the information contained in the fake gzip and we use the path to the encrypted configuration file. We’ve included an example at **gzip_variant/context.json.example**.

![Example configuration file](/assets/images/unpacking-icedid/image3.jpg)

Please note that **“field_0”** and **“stage_2_export”** values have to be found while reversing the sample.

![Populating values from previous research](/assets/images/unpacking-icedid/image16.jpg)

Here we use values from our previous research as placeholders but we have no guarantee that the sample will work 100%. For example, in this sample, we don’t know if the **#1** ordinal export is the actual entry point of the persistence loader.

We also reproduce the first stage behavior by creating the **UponBetter** directory and moving the **license.dat** file into it.

![license.dat in the UponBetter directory](/assets/images/unpacking-icedid/image18.jpg)

We execute the **labs-releases\tools\icedid\gzip_variant\load_core.py** script using the **decrypted core** binary: **license.dat.decrypted** , the **context.json** file.

**WARNING: The binary is going to be loaded/executed natively by this script, Elastic Security Labs does not take responsibility for any damage to your system. Please execute only within a safe environment.**

```
usage: load_core.py [--help] [-o OFFSET] core_path ctx_path

positional arguments:
  core_path             Core custom PE
  ctx_path              Path to json file defining core's context

options:
  -h, --help            show this help message and exit
  -o OFFSET, --offset OFFSET
                        Offset to real data, skip possible garbage
```

Because we have the same garbage bytes problem as stated in the previous section, we use the **“-o 129”** parameter to skip over the garbage bytes.

```
python .\gzip-variant\load_core.py .\extract\license.dat.decrypted .\gzip-variant\context.example.json -o 129

============================================================
Core Loader
============================================================
Base address: 0x180000000
Entrypoint: 0x180001390

Press a key to call entrypoint...
```

When launched, the script will wait for user input before calling the entry point. We can easily attach a debugger to the Python process and set a breakpoint on the ICEDID core entry point (in this example **0x180001390** ).

![Breakpoint set on the ICEDID core entry point](/assets/images/unpacking-icedid/image13.jpg)

Once the key is pressed, we reach the entry point.

![ICEDID entry point](/assets/images/unpacking-icedid/image15.jpg)

If we let the binary execute, we see ICEDID threads being created (indicated in the following screenshot).

![ICEDID threads being created](/assets/images/unpacking-icedid/image6.jpg)

## Unpacking and rebuilding payloads from the rebuilt core binary

For extracting any of the payloads that are embedded inside the core binary, we will use the **labs-releases\tools\icedid\gzip-variant\extract_payloads_from_core.py** script

```
usage: extract_payloads_from_core.py [--help] input output

positional arguments:
  input       Input file
  output      Output directory

options:
  -h, --help  show this help message and exit
```

We’ll use this script on the rebuilt core binary.

```
python .\gzip-variant\extract_payloads_from_core.py .\extract\core.bin core_extract

core_extract\browser_hook_payload_0.cpe
core_extract\browser_hook_payload_1.cpe
```

From here, we output two binaries corresponding to ICEDID’s payloads for web browser hooking capabilities, however, they are still in their custom PE format.

![ICEDID payloads](/assets/images/unpacking-icedid/image10.jpg)

Based on our research, we know that **browser_hook_payload_0.cpe** is the x64 version of the browser hook payload and **browser_hook_payload_1.cpe** is the x86 version.

![Browser hook payload architectures](/assets/images/unpacking-icedid/image12.jpg)

In order to rebuild them, we use the **rebuild_pe.py** script again, this time there are no garbage bytes to skip over.

```
python .\rebuild_pe.py .\core_extract\browser_hook_payload_0.cpe .\core_extract\browser_hook_payload_0.bin

python .\rebuild_pe.py .\core_extract\browser_hook_payload_1.cpe .\core_extract\browser_hook_payload_1.bin
```

Now we have two PE binaries ( **browser_hook_payload_0.bin** and **browser_hook_payload_1.bin** ) we can further analyze.

![Payloads for further analysis](/assets/images/unpacking-icedid/image9.jpg)

Attentive readers may observe that we have skipped the **VNC server** unpacking from the core binary, a decision we made intentionally. We will release it along with other tools in upcoming research, so stay tuned!

## Conclusion

In this tutorial we covered ICEDID GZip variant unpacking, starting with the extraction of the fake GZip binary, followed by the reconstruction of the core binary and unpacking its payloads.

ICEDID is constantly evolving, and we are going to continue to monitor major changes and update our tooling along with our research. Feel free to [open an issue](https://github.com/elastic/labs-releases/issues) or [send us a message](mailto:threat-notification@elastic.co) if something is broken or doesn’t work as expected.

Elastic Security Labs is a team of dedicated researchers and security engineers focused on disrupting adversaries through the publication of detailed detection logic, protections, and applied threat research.

Follow us on [@elasticseclabs](https://twitter.com/elasticseclabs)and visit our research portal for more resources and research.

## References

The following were referenced throughout the above research:

- [https://www.elastic.co/pdf/elastic-security-labs-thawing-the-permafrost-of-icedid.pdf](https://www.elastic.co/pdf/elastic-security-labs-thawing-the-permafrost-of-icedid.pdf)
- [https://securityintelligence.com/new-banking-trojan-icedid-discovered-by-ibm-x-force-research/](https://securityintelligence.com/new-banking-trojan-icedid-discovered-by-ibm-x-force-research/)
- [https://www.justice.gov/opa/pr/emotet-botnet-disrupted-international-cyber-operation](https://www.justice.gov/opa/pr/emotet-botnet-disrupted-international-cyber-operation)
- [https://malpedia.caad.fkie.fraunhofer.de/details/win.darkvnc](https://malpedia.caad.fkie.fraunhofer.de/details/win.darkvnc)
- [https://www.cybereason.com/blog/threat-analysis-report-all-paths-lead-to-cobalt-strike-icedid-emotet-and-qbot](https://www.cybereason.com/blog/threat-analysis-report-all-paths-lead-to-cobalt-strike-icedid-emotet-and-qbot)
- [https://github.com/elastic/labs-releases](https://github.com/elastic/labs-releases)
- [https://github.com/hasherezade/funky_malware_formats/blob/f1cacba4ee347601dceacda04e4de8c699971d29/iced_id_parser/iceid_to_pe.cpp](https://github.com/hasherezade/funky_malware_formats/blob/f1cacba4ee347601dceacda04e4de8c699971d29/iced_id_parser/iceid_to_pe.cpp)
- [https://mh-nexus.de/en/hxd/](https://mh-nexus.de/en/hxd/)
- [https://hex-rays.com/IDA-pro/](https://hex-rays.com/IDA-pro/)
