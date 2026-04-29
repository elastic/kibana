---
title: "EMOTET Dynamic Configuration Extraction"
slug: "emotet-dynamic-configuration-extraction"
date: "2022-12-01"
subtitle: "A tool for the dynamic extraction of EMOTET configurations based on emulation."
description: "Elastic Security Labs discusses the EMOTET trojan and is releasing a tool to dynamically extract configuration files using code emulators."
author:
  - slug: remco-sprooten
image: "lock-code-combination-configuration.jpg"
category:
  - slug: security-research
tags:
  - emotet
---

## Key takeaways

- The EMOTET developers have changed the way they encode their configuration in the 64bit version of the malware.
- Using code emulation we can bypass multiple code obfuscation techniques.
- The use of code emulators in config extractors will become more prevalent in the future.

> To download the EMOTET configuration extractor, check out our post on the tool:
>
> - [EMOTET configuration extractor](https://www.elastic.co/security-labs/emotet-configuration-extractor)

## Preamble

The [EMOTET](https://malpedia.caad.fkie.fraunhofer.de/details/win.emotet) family broke onto the malware scene as a [modular banking trojan in 2014](https://web.archive.org/web/20140701001622/https://blog.trendmicro.com/trendlabs-security-intelligence/new-banking-malware-uses-network-sniffing-for-data-theft/), focused on harvesting and exfiltrating bank account information by inspecting traffic. EMOTET has been adapted as an early-stage implant used to load other malware families, such as [QAKBOT](https://www.elastic.co/security-labs/exploring-the-qbot-attack-pattern), [TRICKBOT](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/Windows_Trojan_Trickbot.yar), and [RYUK](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/Windows_Ransomware_Ryuk.yar). While multiple EMOTET campaigns have been dismantled by international law enforcement entities, it has continued to operate as one of the most prolific cybercrime operations.

For the last several months, Elastic Security has observed the EMOTET developers [transition](https://twitter.com/Cryptolaemus1/status/1516261512372965383?ref_src=twsrc%5Etfw) to a 64-bit version of their malware. While this change does not seem to impact the core functionality of the samples we have witnessed, we did notice a change in how the configuration and strings are obfuscated. In earlier versions of EMOTET, the configuration was stored in an encrypted form in the **.data** section of the binary. In the newer versions the configuration is calculated at runtime. The information we need to extract the configuration from the binary is thus hidden within the actual code.

In the next sections, we’ll discuss the following as it relates to 64-bit EMOTET samples:

- EMOTET encryption mechanisms
- Reviewing the EMOTET C2 list
- Interesting EMOTET strings
- The EMOTET configuration extractor utility

## Encryption keys

EMOTET uses embedded [Elliptic Curve Cryptography](https://blog.cloudflare.com/a-relatively-easy-to-understand-primer-on-elliptic-curve-cryptography/) (ECC) public keys to encrypt their network communication. While in previous versions, the keys would be stored in an XOR-encrypted blob, now the content is calculated at runtime.

![Encoded Encryption Key blob in 64-bit version](/assets/images/emotet-dynamic-configuration-extraction/image14.jpg)

In comparison the previous versions of EMOTET would store an encrypted version of the key data in the . **text** section of the binary.

![Embedded key data in previous version of the malware](/assets/images/emotet-dynamic-configuration-extraction/image10.jpg)

In order to make it harder for security researchers to find the given code the malware uses [Mixed Boolean-Arithmetic](https://www.usenix.org/conference/usenixsecurity21/presentation/liu-binbin) (MBA) as one of its obfuscation techniques. It transforms constants and simple expressions into expressions that contain a mix of Boolean and arithmetic operations.

![Example of Mixed Boolean-Arithmetic](/assets/images/emotet-dynamic-configuration-extraction/image6.jpg)

In this example, an array of constants is instantiated, but looking at the assembly we see that every constant is calculated at runtime. This method makes it challenging to develop a signature to target this function.

We noticed that both the [Elliptic Curve Diffie-Hellman](https://cryptobook.nakov.com/asymmetric-key-ciphers/ecdh-key-exchange) (ECDH) and [Elliptic Curve Digital Signature Algorithm](https://cryptobook.nakov.com/digital-signatures/ecdsa-sign-verify-messages) (ECDSA) keys use the same function to decode the contents.

The ECDH key (which you can recognize by its magic ECK1 bytes) is used for encryption purposes while the ECDSA key (ECC1) is used for verifying the C2 server's responses.

![ECK1 magic bytes at the start of the key data](/assets/images/emotet-dynamic-configuration-extraction/image4.jpg)

![Decoding algorithm for the key material](/assets/images/emotet-dynamic-configuration-extraction/image11.jpg)

By leveraging a YARA signature to find the location of this decode function within the EMOTET binary we can observe the following process:

1. Find the decoding algorithm within the binary.
2. Locate any Cross References ([Xrefs](https://hex-rays.com/blog/igor-tip-of-the-week-16-cross-references/)) to the decoding function.
3. Emulate the function that calls the decoding function.
4. Read the resulting data from memory.

As we mentioned, we first find the function in the binary by using YARA. The signature is provided at the [end of this article](https://www.elastic.co/security-labs/emotet-dynamic-configuration-extraction#yara). It is worth pointing out that these yara signatures are used to identify locations in the binary but are, in their current form, not usable to identify EMOTET samples.

In order to automatically retrieve the data from multiple samples, we created a configuration extractor. In the snippets below, we will demonstrate, in a high level fashion, how we collect the configuration information from the malware samples.

![Python code to find the start of a function](/assets/images/emotet-dynamic-configuration-extraction/image7.jpg)

In the above code snippet:

1. First load the YARA signature.
2. Try to find a match, and if a signature is found in the file.
3. Calculate the function offset based on the offset in the file.

In order to locate the Xrefs to this function, we use the excellent [SMDA decompiler](https://github.com/danielplohmann/smda). After locating the Xrefs, we can start the emulation process using the CPU emulator, [Unicorn](https://www.unicorn-engine.org/).

![Python code used to emulate decoding functions](/assets/images/emotet-dynamic-configuration-extraction/image8.jpg)

1. Initialize the Unicorn emulator.
2. Load the executable code from the PE file into memory.
3. Disassemble the function to find the return and the end of the execution.
4. The binary will try to use the windows [HeapAlloc API](https://learn.microsoft.com/en-us/windows/win32/api/heapapi/nf-heapapi-heapalloc) to allocate space for the decoded data. Since we don't want to emulate any windows API's, as this would add unnecessary complexity, we hook to code so that we can allocate space ourselves.
5. After the emulation has run the 64-bit “long size” register ([RAX](https://www.cs.uaf.edu/2017/fall/cs301/lecture/09_11_registers.html#:~:text=rax%20is%20the%2064%2Dbit,processors%20with%20the%2080386%20CPU.)), it will contain a pointer to the key data in memory.
6. To present the key in a more readable way, we convert it to the standard PEM format.

By emulating the parts of the binary that we are interested in, we no longer have to statically defeat the obfuscation in order to retrieve the hidden contents. This approach adds a level of complexity to the creation of config extractors. However, since malware authors are adding ever more obfuscation, there is a need for a generic approach to defeating these techniques.

![Example of the extractor used to find key material](/assets/images/emotet-dynamic-configuration-extraction/image3.jpg)

## C2 server list

An important part of tracking malware families is to get new insights by identifying and discovering which C2 servers they use to operate their network.

In the 64-bit versions of EMOTET, we see that the IP and port information of the C2 servers are also dynamically calculated at runtime. Every C2 server is represented by a function that calculates and returns a value for the IP address and the port number.

![Examples of encoded IP/port combination](/assets/images/emotet-dynamic-configuration-extraction/image13.jpg)

These functions don’t have a direct cross reference available for searching. However, a procedure references all the C2 functions and creates the **p_c2_list** array of pointers.

![C2 server list](/assets/images/emotet-dynamic-configuration-extraction/image1.jpg)

After that, we can emulate every C2-server function individually to retrieve the IP and port combination as seen below.

![Example of the extractor used to find C2 server list](/assets/images/emotet-dynamic-configuration-extraction/image9.jpg)

## Strings

The same method is applied to the use of strings in memory. Every string has its own function. In the following example, the function would return a pointer to the string **%s\regsvr32.exe "%s"**.

![Encoded string](/assets/images/emotet-dynamic-configuration-extraction/image15.jpg)

All of the EMOTET strings share a common function to decode or resolve the string at runtime. In the sample that we are analyzing here, the string resolver function is referenced 29 times.

![String decoding algorithm](/assets/images/emotet-dynamic-configuration-extraction/image2.jpg)

This allows us to follow the same approach as noted earlier in order to decode all of the EMOTET strings. We pinpoint the string decoding function using YARA, find the cross-references, and emulate the resulting functions.

![Example of the extractor used to find strings](/assets/images/emotet-dynamic-configuration-extraction/image12.jpg)

## Configuration extractor

Automating the payload extraction from EMOTET is a crucial aspect of threat hunting as it gives visibility of the campaign and the malware deployed by the threat actors, enabling practitioners to discover new unknown samples in a timely manner.

```
% emotet-config-extractor --help
usage: Emotet Configuration Extractor [-h] (-f FILE | -d DIRECTORY) [-k] [-c] [-s] [-a]

options:
  -h, --help            show this help message and exit
  -f FILE, --file FILE  Emotet sample path
  -d DIRECTORY, --directory DIRECTORY
                        Emotet samples folder
  -k                    Extract Encryption keys
  -c                    Extract C2 information
  -s                    Extract strings
  -a                    Extract strings (ascii)
```

Our extractor takes either a directory of samples with **-d** option or **-f** for a single sample and then can output parts of the configuration of note, specifically:

- **-k** : extract the encryption keys
- **-c** : extract the C2 information
- **-s** : extract the wide-character strings
- **-a** : extract the ASCII character stings

EMOTET uses a different routine for decoding wide and ASCII strings. That is why the extractor provides flags to extract them separately.

The C2 information displays a list of IP addresses found in the sample. It is worth noting that EMOTET downloads submodules to perform specific tasks. These submodules can contain their own list of C2 servers. The extractor is also able to process these submodules.

The submodules that we observed do not contain encryption keys. While processing submodules you can omit the **-k** flag.

```
[...]
[+] Key type: ECK1
[+] Key length: 32
-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE2DWT12OLUMXfzeFp+bE2AJubVDsW
NqJdRC6yODDYRzYuuNL0i2rI2Ex6RUQaBvqPOL7a+wCWnIQszh42gCRQlg==
-----END PUBLIC KEY-----
[...]
[+] Key type: ECS1
[+] Key length: 32
-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE9C8agzYaJ1GMJPLKqOyFrlJZUXVI
lAZwAnOq6JrEKHtWCQ+8CHuAIXqmKH6WRbnDw1wmdM/YvqKFH36nqC2VNA==
-----END PUBLIC KEY-----
[...]
[+] Found 64 c2 subs
174.138.33.49:7080
188.165.79.151:443
196.44.98.190:8080
[...]
[+] Starting emulation
[+] String BLOB address: 0x4000000
KeyDataBlob
[...]
[+] String BLOB address: 0x4000000
bcrypt.dll
[...]
[+] String BLOB address: 0x4000000
RNG
```

To enable the community to further defend themselves against existing and new variants of EMOTET, we are making the payload extractor open source under the Apache 2 License. Access the [payload extractor documentation and binary download](https://www.elastic.co/security-labs/emotet-configuration-extractor).

## The future of EMOTET

The EMOTET developers are implementing new techniques to hide their configurations from security researchers. These techniques will slow down initial analysis, however, EMOTET will eventually have to execute to achieve its purpose, and that means that we can collect information that we can use to uncover more about the campaign and infrastructure. Using code emulators, we can still find and extract the information from the binary without having to deal with any obfuscation techniques. EMOTET is a great example where multiple obfuscation techniques make static analysis harder. But of course, we expect more malware authors to follow the same example. That is why we expect to see more emulation-based configuration extract in the future.

![EMOTET running and gathering system information](/assets/images/emotet-dynamic-configuration-extraction/image5.png)

## Detection

### YARA

Elastic Security has created YARA rules to identify this activity. The YARA rules shown here are not meant to be used to solely detect EMOTET binaries, they are created to support the configuration extractor. The YARA rules for detecting EMOTET can be found in the [protections-artifacts repository](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/Windows_Trojan_Emotet.yar).

#### EMOTET key decryption function

```
rule resolve_keys
{
meta:
     author = "Elastic Security"
     description = "EMOTET - find the key decoding algorithm in the PE"
     creation_date = "2022-08-02"
     last_modified = "2022-08-11"
     os = "Windows"
     family = "EMOTET"
     threat_name = "Windows.Trojan.EMOTET"
     reference_sample = "debad0131060d5dd9c4642bd6aed186c4a57b46b0f4c69f1af16b1ff9c0a77b1"
   strings:
       $chunk_1 = {
        45 33 C9
        4C 8B D0
        48 85 C0
        74 ??
        48 8D ?? ??
        4C 8B ??
        48 8B ??
        48 2B ??
        48 83 ?? ??
        48 C1 ?? ??
        48 3B ??
        49 0F 47 ??
        48 85 ??
        74 ??
        48 2B D8
        42 8B 04 03
     }
   condition:
       any of them
}
```

#### EMOTET C2 aggregation

```
rule c2_list
{
     author = "Elastic Security"
     description = "EMOTET - find the C2 collection in the PE"
     creation_date = "2022-08-02"
     last_modified = "2022-08-11"
     os = "Windows"
     family = "EMOTET"
     threat_name = "Windows.Trojan.EMOTET"
     reference_sample = "debad0131060d5dd9c4642bd6aed186c4a57b46b0f4c69f1af16b1ff9c0a77b1"
  strings:
     $chunk_1 = {
        48 8D 05 ?? ?? ?? ??
        48 89 81 ?? ?? ?? ??
        48 8D 05 ?? ?? ?? ??
        48 89 81 ?? ?? ?? ??
        48 8D 05 ?? ?? ?? ??
        48 89 81 ?? ?? ?? ??
        48 8D 05 ?? ?? ?? ??
        48 89 81 ?? ?? ?? ??
        48 8D 05 ?? ?? ?? ??
        48 89 81 ?? ?? ?? ??
        48 8D 05 ?? ?? ?? ??
        48 89 81 ?? ?? ?? ??
        48 8D 05 ?? ?? ?? ??
        48 89 81 ?? ?? ?? ??
     }
  condition:
     any of them
}
```

#### EMOTET string decoder

```
rule string_decode
{
   meta:
     author = "Elastic Security"
     description = "EMOTET - find the string decoding algorithm in the PE"
     creation_date = "2022-08-02"
     last_modified = "2022-08-11"
     os = "Windows"
     family = "EMOTET"
     threat_name = "Windows.Trojan.EMOTET"
     reference_sample = "debad0131060d5dd9c4642bd6aed186c4a57b46b0f4c69f1af16b1ff9c0a77b1"
  strings:
     $chunk_1 = {
        8B 0B
        49 FF C3
        48 8D 5B ??
        33 CD
        0F B6 C1
        66 41 89 00
        0F B7 C1
        C1 E9 10
        66 C1 E8 08
        4D 8D 40 ??
        66 41 89 40 ??
        0F B6 C1
        66 C1 E9 08
        66 41 89 40 ??
        66 41 89 48 ??
        4D 3B D9
        72 ??
     }
     $chunk_2 = {
        8B 0B
        49 FF C3
        48 8D 5B ??
        33 CD
        0F B6 C1
        66 41 89 00
        0F B7 C1
        C1 E9 ??
        66 C1 E8 ??
        4D 8D 40 ??
        66 41 89 40 ??
        0F B6 C1
        66 C1 E9 ??
        66 41 89 40 ??
        66 41 89 48 ??
        4D 3B D9
        72 ??
     }
  condition:
     any of them
}
```
