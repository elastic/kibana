---
title: "Ransomware in the honeypot: how we capture keys with sticky canary files"
slug: "ransomware-in-the-honeypot-how-we-capture-keys"
date: "2024-02-23"
description: "This article describes the process of capturing encryption keys from ransomware using Elastic Defend ransomware protection."
author:
  - slug: salim-bitam
  - slug: christophe-alladoum
image: "photo-edited-07.png"
category:
  - slug: security-research
tags: 
  - ransomware
  - canary
  - honeypot
---

## TL;DR

![Source: https://twitter.com/DebugPrivilege/status/1716890625864564796](/assets/images/ransomware-in-the-honeypot-how-we-capture-keys/image12.png)


At Elastic, we have bi-annual ON Weeks, where engineers break into “hack-a-thon” teams to tackle a technical challenge voted on by the team. This article presents the outcome of [yet another](https://www.elastic.co/security-labs/deep-dive-into-the-ttd-ecosystem) Elastic ON Week, where we delved into an innovative application of Elastic Endpoint ransomware protection. Our research used our existing ransomware canary protection, deployed since 7.14, to generate memory snapshots (i.e., data collections that record process information) of the process(es) identified as ransomware. Through analysis of these snapshots, our research illustrated how we could recover critical information for the forensics process and even encryption keys, allowing for complete decryption.

This process memory snapshotting mechanism was added starting with Elastic Defend 8.11, allowing DFIR teams to find memory dumps of ransomware flagged by our ransomware protection, all within Elastic Endpoint’s secure installation folder (by default, ```$ElasticInstallPath\Endpoint\cache\RansomwareDumps```). 

## Introduction

In 2024, we don't need to explain what ransomware is or the multibillion-dollar industry it's become or explain how even companies with unlimited budgets struggle to contain or prevent it. These adversaries are mature and efficient, often outpacing security functions like forensic and malware analysis.

### Current state of protection

Thankfully, over the years, AVs/EDRs have become increasingly better at detecting and preventing ransomware. Among the most common existing mitigations, we find: 

 - Static and dynamic detection by signatures: this is usually performed at various levels (through hashes at a file or ELF/PE section level) and file activity (write access to files with high entropy changes) has the advantage of being easily and rapidly implemented, but are also likely to generate false positives 
 - Reverse engineering: Reversing binaries can expose new ways to interfere with execution, as malware authors implement OS-level fail-safes (for instance, through Mutant objects) and/or network fail-safes (like WANNACRY) 
 - Recovery backups: These are not always thoroughly tested, and even if they’re working there is a risk of data loss between the last backup and the moment of infection 
 - Shadow copies: Somewhat similar to recovery backups, ransomware usually actively locates and attempts to destroy them prior to encrypting files on a system 
 - High entropy and rapid file change: This approach is purely experimental and attempts to detect drastic changes in the file content as an indicator of encryption, however, this is also very false positive (FP) prone
 - Last cryptography weakness: By far the most complex mitigation, as it requires reverse engineering and cryptographic knowledge, but also luck as adversaries hope that the author rolls their own crypto API (see Elastic's Mark Mager [2019 DEFCON talk](https://youtu.be/0TF9NLsGCHA) for some examples); this approach can’t work against modern OS native cryptographic APIs as long as they’re properly implemented according to documentation

### How ransomware (usually) works, and why it matters

It is imperative that we know both what we're protecting against and how it internally operates to be effective. This diverse nature underlines that there may never be a universal solution to combat all ransomware strains. Understanding this diversity also emphasizes the importance of our technique, which provides significant insights about ransomware.

From a high level, the sequence of actions that ransomware executes is usually summarized as such:

 1. **Delivery**: this can be done in several ways, from social engineering to 0-day/1-day vulnerability exploitation. This approach can also rely on weak passwords to remotely infect targets.
 2. **C2 Communication**: once the execution starts, the ransomware may communicate with the C2 to exchange configuration and share information about the victim. This step can also leave room for the C2 to have a kill switch in place, preventing further infection
 3. **Encryption**: after establishing a cryptographic context, the process recursively browses the file system, looks for files with specific extensions, and encrypts them.
 4. **Extortion**: after sharing the decryption keys with the C2, the ransomware will drop a ransom note and (usually very visibly) notify the infected user of its actions and ways to obtain the decryption key. At that point, all cryptographic context allowing recovery may already be lost 
 5. **Propagation**: if possible, the ransomware may try to infect more systems automatically.

However, looking at it at a lower level reveals that ransomware operates quite uniquely: for example, focusing on the delivery step, the notorious [WANNACRY ransomware](https://www.cisa.gov/sites/default/files/FactSheets/NCCIC%20ICS_FactSheet_WannaCry_Ransomware_S508C.pdf) spread via a vulnerability in the Windows operating system, known as [EternalBlue](https://arstechnica.com/information-technology/2017/04/nsa-leaking-shadow-brokers-just-dumped-its-most-damaging-release-yet/); whereas [LOCKBIT](https://malpedia.caad.fkie.fraunhofer.de/details/win.lockbit) variants tend to infect using phishing emails, exploit kits, or by leveraging compromised Remote Desktop Protocol (RDP) credentials. 

During this research, it was mostly the 3rd step that interested us as it is usually where detection and prevention can be most effective, such as with our canary protection.

### Understanding the Canary files feature in Elastic Endpoint 

Originating in Elastic 7.14, Elastic Endpoint ransomware protection uses [canary files](https://www.elastic.co/blog/deterring-ransomware-for-state-and-local-government) with the purpose of attempting to honeypot ransomware by (over-)writing some specific files. This provides a high confidence indicator that the culprit process is attempting to encrypt all files.

A canary file acts and looks exactly like any other file - it can have valid content (DOCX, PDF, etc.), hidden, or marked as a system file to avoid user tampering. However, canary files cannot be “fingerprinted” and avoided by ransomware. All of these factors lead to a robust indicator for ransomware access.

Even though canary files are very successful in providing indicators for ransomware, it is hard to be certain on Windows systems that no file has been encrypted *before* the detection (and, if wanted, termination) occurs. This is not a product defect, it is due to the very structure of how MiniFilters work on Windows. Therefore, even though the attack is thwarted, some files may have been encrypted. Worse, if the process is terminated, the possibility of retrieving the original content may be completely lost.

And this is where our ON Week research began…

## Extending our canary protection to generate process snapshots

### The basic underlying concept

The idea behind this first research was as follows:
 - At the kernel level, detect write access attempts to a file with a specific name (our canary)
 - From userland, generate a process dump of the culprit process attempting the write operation and signal the driver to continue execution as designed
 - Analyze process dumps

With ON Week being limited to one week, this is the initial time frame we had for developing a prototype. 

### Implementation

#### In kernel land

Developing a MiniFilter driver to monitor write access to files with specific names went relatively easily following the well-documented [MiniFilter API documentation](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/_ifsk/):
 
 1. Declare the filter table containing the callbacks we want to install, one for write access when invoking ```NtWriteFile()```, and another for when attempting to write to a mapped section

![Registering MiniFilter callbacks for file and section writes](/assets/images/ransomware-in-the-honeypot-how-we-capture-keys/image19.png)


 2. Create and register the filter, including the file name pattern to monitor and start filtering:
 ![Declaring a filename pattern to inspect for the MiniFilter driver](/assets/images/ransomware-in-the-honeypot-how-we-capture-keys/image5.png)

_Image 2: Declaring a filename pattern to inspect for the MiniFilter driver_
Once our filter is registered to the Filter Manager, write accesses will go through our driver’s callbacks when specific syscalls are triggered: by ```NtWriteFile``` when a process attempts to write a buffer to a file, or by ```NtCreateSection()``` when a process to create a section with file-backed mappings with write access (```SECTION_MAP_WRITE```)

![Suspending process upon write access detection to the canary file](/assets/images/ransomware-in-the-honeypot-how-we-capture-keys/image16.png)


As we can see either action will result in the invoking process being suspended (call to our function ```SuspendProcessById```) allowing a userland process to snapshot its memory. The following video summarizes all those steps:

![Source: https://youtu.be/U0vCHzN-69w](/assets/images/ransomware-in-the-honeypot-how-we-capture-keys/image2.png)


### In user land

Generating memory dumps is a robust mechanism well anchored into Windows and a significant part of its Error Reporting mechanism - or [WER](https://learn.microsoft.com/en-us/windows/win32/wer/windows-error-reporting). Through simple and explicit API calls, like [```MiniDumpWriteDump```](https://learn.microsoft.com/en-us/windows/win32/api/minidumpapiset/nf-minidumpapiset-minidumpwritedump) any user or program may dump (if permission permits) the complete memory layout and content of a target process, along with more information depending on flags passed during invocation such as:
 - handle information
 - thread information
 - unloaded module details and more

A complete reference list of available types can be consulted [here](https://github.com/Skulltrail192/One-Core-Api/blob/76729f2108c2afca24d89efc92b814a07b92a62e/dll/win32/dbghelp/compat.h#L914-L931).

We decided to use memory dumps, designed for debugging software, to extend our ransomware protection feature's existing canary file capabilities. When ransomware is detected, we generate a complete memory dump before the process is terminated. Using memory dumps against malware has tremendous advantages, including:
 - Revealing the process memory layout, which is particularly useful when packing has obscured the memory regions
 - Disclosing all memory contents of the process as it is running, including unwiped memory regions since Windows does not immediately erase memory for performance reasons 
 - Providing stable and safe ways to experiment against malware through emulation

![Creating the memory dump from the user-mode process](/assets/images/ransomware-in-the-honeypot-how-we-capture-keys/image11.png)


Very quickly, we had a stable and reliable way to detect canary write access and generate complete memory dumps of the ransomware triggering them. Due to time constraints, we selected two popular families to test the analysis phase of our project: NOTPETYA and WANNACRY.

The prototype code can be found [here](https://github.com/calladoum-elastic/canary-driver) and is not intended for production use. Please experiment at your own risk, using non-production systems.

### Real-life examples

#### Recovering keys from process runtime: the case of NOTPETYA

Why NOTPETYA? It was a good first candidate because it encrypts all files with one random session key. It also uses strong cryptography:
 - RSA-1024 for the host-level asymmetric encryption key
 - A unique AES-128 CBC key used for encrypting the files

Using the driver and agent crafted above, we could easily have NOTPETYA (SHA1 [`027cc450ef5f8c5f653329641ec1fed91f694e0d229928963b30f6b0d7d3a745`](https://www.virustotal.com/gui/file/027cc450ef5f8c5f653329641ec1fed91f694e0d229928963b30f6b0d7d3a745)) run in a contained environment and get a process minidump at a very predictable runtime location. 

Our current design causes the driver to capture the writes synchronously, so we know exactly where we are in the process runtime when analyzing dump files. However, we still needed some reverse engineering to learn exactly how the session keys were generated.

Reversing this NOTPETYA DLL proved to be straightforward, which helped us move quickly: 
 - After some initial checks, the DLL attempts to iterate through all the possible drive letters, and for each match (i.e., the letter - such as `C:\` exists) a `0x20` thread context will be created to proceed with the encryption

![Reversing NOTPETYA encryption steps](/assets/images/ransomware-in-the-honeypot-how-we-capture-keys/image4.png)


 - Each thread initializes its own cryptographic context using the Microsoft CryptoAPI; we  note the use of AES-CBC 128 bits
 
![Confirming NOTPETYA’s use of AES 128 CBC](/assets/images/ransomware-in-the-honeypot-how-we-capture-keys/image14.png)


 - Encrypts the files recursively (with a maximum recursion level of 15), dropping the ransom message and destroying the cryptographic context

![NOTPETYA recursive cryptographic context mechanism](/assets/images/ransomware-in-the-honeypot-how-we-capture-keys/image10.png)


 - The file encryption itself is performed using file-backed mappings to overwrite files of specifically targeted extensions:

![NOTPETYA file encryption using key from the global context](/assets/images/ransomware-in-the-honeypot-how-we-capture-keys/image20.png)


This leaves us with a very basic stack-based structure for the context:

```
c
struct _THREAD_CONTEXT { /* sizeof=0x20, align=0x4, mappedto_50) */
  /* 00000000 */ WORD lpswzRootPathName[4];
  /* 00000008 */ HANDLE hProvider;
  /* 0000000C */ PVOID field_C;
  /* 00000010 */ LPVOID pBase64Data;
  /* 00000014 */ HCRYPTPROV hKey;
  /* 00000018 */ DWORD field_18;
  /* 0000001C */ HANDLE hFile;
};
```

Equipped with that knowledge, we could explore further in the dump. Since we know write accesses were made using ```kernel32!CreateFileMapping```, this means ```ntdll!NtCreateSection``` is called, and we can isolate the active thread that triggered the syscall to the canary file:

```
dx @$curprocess.Threads.Where( t => t.Stack.Frames.First().ToDisplayString().Contains("NtCreateSection") )
```

![Retrieving the active thread in the memory dump](/assets/images/ransomware-in-the-honeypot-how-we-capture-keys/image7.png)


As explained previously, we’ve isolated the context session and know it’s located in the stack. From the base pointer to the session context, we can retrieve the cryptographic context from the context structure member ```_THREAD_CONTEXT.hKey``` located at offset 0x14.

```
0:007:x86> dx @$curthread.Stack.Frames[3].Attributes.FrameOffset + 0x10
@$curthread.Stack.Frames[3].Attributes.FrameOffset + 0x10 : 0x518d210
0:007:x86> dps poi(0x518d210) l6
004859a0  003a0043
004859a4  0000005c
004859a8  00538418
004859ac  00000000
004859b0  04060550 
004859b4  0048fc48   <<< hKey
0:007:x86> dps 0048fc48 
0048fc48  74a850c0 rsaenh!CPGenKey
0048fc4c  74a9ad90 rsaenh!CPDeriveKey
0048fc50  74a886c0 rsaenh!CPDestroyKey
0048fc54  74a9c770 rsaenh!CPSetKeyParam
0048fc58  74a898c0 rsaenh!CPGetKeyParam
0048fc5c  74a84c40 rsaenh!CPExportKey
0048fc60  74a86290 rsaenh!CPImportKey
0048fc64  74a99880 rsaenh!CPEncrypt
0048fc68  74a8a500 rsaenh!CPDecrypt
0048fc6c  74a9b5c0 rsaenh!CPDuplicateKey
0048fc70  00538418 
0048fc74  e3155764 <<< hCryptKey
0048fc78  22222222
[...]
```

The crypto context structures are not made publicly accessible by Microsoft but have been [reverse-engineered](https://forums.codeguru.com/showthread.php?79163-Structure-of-HCRYPTKEY-Data&s=b0a1fb3f896437fc13727105e44628d6&p=2234957#post2234957)

```
struct HCRYPTKEY
{
    void* CPGenKey;
    void* CPDeriveKey;
    void* CPDestroyKey;
    void* CPSetKeyParam;
    void* CPGetKeyParam;
    void* CPExportKey;
    void* CPImportKey;
    void* CPEncrypt;
    void* CPDecrypt;
    void* CPDuplicateKey;
    HCRYPTPROV hCryptProv;
    magic_s *magic; // XOR-ed
};
struct magic_s
{
    key_data_s *key_data;
};

struct key_data_s
{
    void *unknown; // XOR-ed pointer
    uint32_t alg;
    uint32_t flags;
    uint32_t key_size;
    void* key_bytes;
};
```

From this context, we can extract and decode the location of the AES structure, as the key is known to be [```0xE35A172C```](https://forums.codeguru.com/showthread.php?79163-Structure-of-HCRYPTKEY-Data&s=b0a1fb3f896437fc13727105e44628d6&p=2234957#post2234957) for 32-bit processes:

```
0:007:x86> ? e3155764^ 0xE35A172C
Evaluate expression: 5193800 = 004f4048

0:007:x86> dps poi(004f4048 ) l5
0053cdd0  e3152844   // /* +0 */ unknown
0053cdd4  0000660e   // /* +4 */ alg
0053cdd8  00000001   // /* +8 */ flags
0053cddc  00000010   // /* +c */ key_size
0053cde0  0053ce70   // /* +10 */ key_bytes
```

From the dump, we also know the type (AES-CBC), location in memory (`0x053ce70`), and size (`0x10`) of the key. The session key can be successfully retrieved! 

![NOTPETYA file encryption key, extracted from the session context in the memory dump](/assets/images/ransomware-in-the-honeypot-how-we-capture-keys/image1.png)


Not only does this allow complete decryption of all encrypted files for this process, but the astute observer would have noticed that all [those steps can be automated](https://gist.github.com/calladoum-elastic/8a142ad8b20de048a0edb2ec6fde2660), allowing us to create decryptors using just the generated memory dump!

![Automatically extracting session key](/assets/images/ransomware-in-the-honeypot-how-we-capture-keys/image18.png)


To see this process fully, you can watch the [demo](https://youtu.be/UCZFAV9EveQ) and check out the [code](https://gist.github.com/calladoum-elastic/3b733b023c237a6017b399d4c4f18d27#file-notpetya_extract_key_from_dump-py) on GitHub. 

We can even create scripts for decryption that would apply to all machines infected with the same variant. Even though WinDbg is the tool of choice, all those steps can be completely automated, making this approach very scalable.

### Predicting encryption keys from the process runtime: the case of WANNACRY

WANNACRY is another ransomware family we felt qualified for this experiment, as it is well-known and – most importantly for this research – used a more complex logic for file encryption:

![A description of WANNACRY’s encryption from Akbanov et al. (JTIT 2019)](/assets/images/ransomware-in-the-honeypot-how-we-capture-keys/image8.png)


#### Deep dive into Windows (Pseudo-)random Number generation

To encrypt files, WANNACRY uses Windows' encryption library and generates one random AES key per file by means of the high-level API function [```advapi32!CryptGenRandom```](https://learn.microsoft.com/en-us/windows/win32/api/wincrypt/nf-wincrypt-cryptgenrandom). Each key is associated with the corresponding file, then RSA-encrypted and submitted to its C2. By design, the approach we used against NOTPETYA will not work here. WANNACRY offered us a different challenge, once again demonstrating that having a complete memory dump provides other invaluable resources.

Random number generation is often less random than most people think. Generating a truly random number is both challenging and expensive, and this challenge is at the heart of any cryptographic algorithm. 

Windows (not unlike other OS) generates [random numbers in a pseudo-random way](https://en.wikipedia.org/wiki/Pseudorandom_number_generator). This means the random number generator derives an initial state (called a seed) with a cryptographic function (for instance, XorShift or Mersenne-Twister). One of the logical consequences of using PRNG is that knowing the state of the random generator at a moment T allows us to know precisely all random values at T+1, T+2, etc. Note that this is not a weakness as randomness is a highly complex and performance-costly operation; this approach is a great trade-off. 

We will be taking advantage of this property to defeat WANNACRY. Knowing that WANNACRY repeatedly will call CryptGenRandom to generate the AES encryption for each file, if we have a way to know those values strictly through emulation of the minidump file, then we will also know the possible AES keys. This looks promising but may conceal several roadblocks. 

Taking a step back, what is CryptGenRandom in the first place – what does it do? The [MSDN](https://learn.microsoft.com/en-us/windows/win32/api/wincrypt/nf-wincrypt-cryptgenrandom) informs us that this (deprecated) function fills up a buffer with random content using a [Cryptographic Service Provider](https://learn.microsoft.com/en-us/windows/desktop/SecGloss/c-gly)(HCRYPTPROV). Setting a breakpoint to CryptGenRandom  allows us to look under the hood with WinDbg on a Windows 11 x64. We can then easily traverse the high-level APIs and observe that ```advapi32!CryptGenRandom``` is a wrapper to ```cryptsp!CryptGenRandom```, which in turn leads us to the ```CPGenRandom``` function in ```rsaenh.dll```.

```
0:000> g
Breakpoint 9 hit
CRYPTSP!CryptGenRandom+0x29:
00007ffc`990c1699 488b8be0000000  mov     rcx,qword ptr [rbx+0E0h] ds:000001e1`38ade010=e35a16cde1cff7d0
0:000> dps @rbx
000001e1`38addf30  00007ffc`987956d0 rsaenh!CPAcquireContext
000001e1`38addf38  00007ffc`987951e0 rsaenh!CPReleaseContext
000001e1`38addf40  00007ffc`98791140 rsaenh!CPGenKey
000001e1`38addf48  00007ffc`987a8f80 rsaenh!CPDeriveKey
000001e1`38addf50  00007ffc`987948a0 rsaenh!CPDestroyKey
000001e1`38addf58  00007ffc`987aaac0 rsaenh!CPSetKeyParam
[...]

0:000> t
CRYPTSP!CryptGenRandom+0x3c:
00007ffc`990c16ac ff1506c50000    call    qword ptr [CRYPTSP!_guard_dispatch_icall_fptr (00007ffc`990cdbb8)] ds:00007ffc`990cdbb8={CRYPTSP!guard_dispatch_icall_nop (00007ffc`990c4d30)}

0:000> r rax, rcx,rdx ,r8
rax=00007ffc987954d0 rcx=e35a16cde1cff7d0 rdx=0000000000000010 r8=00000065859bfe70

0:000> .printf "%y\n", @rax
rsaenh!CPGenRandom (00007ffc`987954d0)
```

When ```CRYPTSP!CryptGenRandom``` is invoked, the RCX register holds the pointer to the encoded crypto provider, which is XOR encoded with the magic constant ```0xE35A172CD96214A0``` (Remember the ```0xE35A172C``` magic constant we used earlier? This is its 64-bit version counterpart). Looking at ```rsaenh!CPGenRandom``` in IDA made clear the cryptographic provider handle serves only as a check to determine the correct validity of the context passed to the function but has no real implication about the randomness generation.

![Reversing rsaenh.dll to understand the random number generation](/assets/images/ransomware-in-the-honeypot-how-we-capture-keys/image17.png)


The entire randomness generation logic is deported to the function ```cryptbase!SystemFunction036```, which simply takes two arguments: the buffer to receive the random data and its length. This was great news because random number generation had no external factor an attacker could use at runtime to make the generation more complex. Going farther into the rabbit hole, we realized that ```cryptbase!SystemFunction036``` itself is nothing more than a light wrapper for ```bcryptprimitives!ProcessPrng```, which – by the name of the function – seems to match our expectations.

The ```bcryptprimitives``` DLL is part of the [Cryptographic Next Generation API](https://learn.microsoft.com/en-us/windows/win32/seccng/cng-portal) (CNG) and is quite complex. Fully reversing would be out-of-scope for this research, so we only focused on the parts we're interested in. First, we observed that once loaded in the process, the library initializes the process seed - either from the [```rdrand```](https://www.felixcloutier.com/x86/rdrand) instruction or from a VTL1 call to the [```IumKernelState```](https://learn.microsoft.com/en-us/windows/win32/procthread/isolated-user-mode--ium--processes) trustlet in the explicitly named ```InitUmRootRngState``` function. Then, it populates a random number generator state table and updates the RNG seed version state in the ```ntdll!_KUSER_SHARED_DATA::RNGSeedVersion```.

![Validating the cryptographic seed initialization from WinDbg](/assets/images/ransomware-in-the-honeypot-how-we-capture-keys/image9.png)


When ```ProcessPrng``` is invoked, the generation of the next pseudo-random number is determined by a CPU-specific state. To be precise, the processor number on which the current thread is running is used as an index to load and generate the next number. We’ll explain more later, but this will be challenging in the future. Using this state information, the next number is produced by invoking ```AesRNGState_generate```, storing the result inside the buffer given in an argument.

![Next random buffer generation in cryptbase.dll](/assets/images/ransomware-in-the-honeypot-how-we-capture-keys/image6.png)


This is a non-negligible issue for what we’re trying to accomplish. On multiprocessor-aware Windows (which all modern PCs are), it is hard to consistently know the processor number the thread is running on, making generation prediction impossible. However, Windows provides ways to affect the scheduler, as shown below.

![Retrieving current CPU number to determine the PNRG state table entry to use](/assets/images/ransomware-in-the-honeypot-how-we-capture-keys/image13.png)


#### Pseudo-Random number prediction through user-mode emulation of the memory dump

Keeping in sight that to defeat WANNACRY, we need to be able to execute the function ```cryptbase!SystemFunction036``` directly from the memory dump. We can make this with an emulator (like QEMU or Bochs) by mapping the execution context (populating the memory layout, restoring the TEB/PEB etc.) gathered from the memory dump of the ransomware, which we did following these steps:
 1. Parse the user-mode dump to [extract and map all the memory layout](https://gist.github.com/calladoum-elastic/3b733b023c237a6017b399d4c4f18d27#file-emulate_cryptrandomgen-py-L272-L287); for this step, we used the Python bindings of the [udmp-parser](https://github.com/0vercl0k/udmp-parser) library
 2. Fully [reconstruct a working memory layout in an emulator](https://gist.github.com/calladoum-elastic/3b733b023c237a6017b399d4c4f18d27#file-emulate_cryptrandomgen-py-L291-L322), for which [bochscpu](https://github.com/yrp604/bochscpu) along with its [Python bindings](https://github.com/hugsy/bochscpu-python) were used
 3. [Rebuild a valid thread context](https://gist.github.com/calladoum-elastic/3b733b023c237a6017b399d4c4f18d27#file-emulate_cryptrandomgen-py-L354-L370) by finding the function ```cryptbase!SystemFunction036``` and emulating the runtime

However, we still lack the ability to predict on which CPU the thread invoking ```cryptbase!SystemFunction036``` will be running on, therefore, cannot accurately predict the following values returned by the function. On a single-core machine, this is not a problem as our PRNG state table will only hold one entry, and this approach was tested to work perfectly out-of-the-box. However, it fails on multi-core systems, as only the first call to ```cryptbase!SystemFunction036``` would return the correct random values.

![Execution of ```cryptbase!SystemFunction036``` on single core VM: different outputs](/assets/images/ransomware-in-the-honeypot-how-we-capture-keys/image15.png)


To have accurate emulation on multi-core machines, we need to know the processor number on which the next thread calling ```cryptbase!SystemFunction036``` will be called at runtime is fairly impossible. Two possible approaches were tested:
 1. From the dump, we have knowledge of the entire PRNG state table. Because of this, we can make the emulation script hook the function ```ntdll!RtlGetCurrentProcessorNumberEx``` and use it to determine the index in the random table, then have it generate all the values for a specific core. This approach proved successful but extremely tedious, especially at scale as automation would generate exponential possibilities to retrieve the correctly generated sequence.
 2. Another option happens during the canary detection itself. Once the canary confirms it is ransomware, we can enforce the culprit process CPU affinity to only one CPU, whose index we can choose freely. This can be done from kernel or user mode as long as the targeted process is opened with the [```PROCESS_SET_INFORMATION```](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-setprocessaffinitymask) access right. This processor index will determine the entry taken in the `AesStateTable` array, and doing so allows us to reliably predict all future values of the PNRG via emulation.

![EExecution of ```cryptbase!SystemFunction036``` on multi-core VM with forced affinity: same output](/assets/images/ransomware-in-the-honeypot-how-we-capture-keys/image3.png)


To see the WANNACRY process in full, you can watch the [demo](https://youtu.be/uXqI0ZSqZhI). We also have the [code](https://gist.github.com/calladoum-elastic/3b733b023c237a6017b399d4c4f18d27) available for review on GitHub.

Testing both techniques showed that it is possible to predict the future value of the PRNG with the minidump at our disposal. This would be immensely helpful against ransomware like WANNACRY, which uses Windows PRNG to generate unique AES keys for each encrypted file.

## Incorporating this research into the Elastic Endpoint

ON Week at Elastic is a place for experimenting without constraints and often leads to great improvements for the existing Elastic solutions. 

Process snapshot generation was added to Elastic Security in version [8.11](https://www.elastic.co/blog/whats-new-elastic-security-8-11-0). With protection enabled, should ransomware be detected, the endpoint will generate a complete memory process dump before resuming execution, likely leading to the ransomware process termination. We hope this simple addition can assist DFIR teams further by providing better insight into what the ransomware was attempting. 

Recent news has shown that process memory dumps can leak a [great amount of valuable private information](https://www.msn.com/en-us/news/technology/microsoft-china-stole-secret-key-that-unlocked-us-govt-email-from-crash-debug-dump/ar-AA1glLPJ) if made available publicly. Therefore, it must be stressed that no memory dump is ever submitted to Elastic, even with the feature enabled. The dump file is generated (and compressed) by the endpoint locally, and the resulting file is stored within Elastic’s secure installation folder (by default, ```$ElasticInstallPath\Endpoint\cache\RansomwareDumps```). This way, the dump files cannot be easily tampered with by attackers but are easily accessible to forensics and incident response teams to assist them in the recovery process.

Let’s demonstrate this feature in action on a fresh Elastic 8.11 against NOTPETYA: [watch the demo](https://youtu.be/d16yKWUf3dI)

## Closing remarks

This concluded our ON Week research with quite a positive outcome. Did we come up with a bulletproof solution against all ransomware? No, and such a thing likely won’t ever exist. As we’ve underlined in the introduction, ransomware exists in so many types and varieties that it probably seems impossible to have one solution for all.

What this research found, however, was that this approach offers a great trade-off between FP risk, system requirements, and potential outcome. There is very little risk of snapshotting the process memory should it be flagged as ransomware by the canary feature. In the case of a false positive, the computer would simply end up with a dump file in a protected location (and ZIP compression would drastically reduce the footprint on disk).

While this is not the perfect ransomware solution, offering a memory dump of the ransomware can boost forensic work and potentially allow teams to recover or even predict session encryption keys. Complete memory dumps can be an amazing ally in debugging and forensics because they provide an exhaustive view of how things happen at runtime. And thanks to emulation, we can confidently retrace some of the steps that lead to a compromise and hopefully fix it.
