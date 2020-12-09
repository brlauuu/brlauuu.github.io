In this blog post, I will discuss how I used BLAT to solve a protein sequence alignment task.

## BLAT

Firstly, a short introduction. Blast Like Alignment Tool (BLAT) is sequence alignment tool written by W. James Kent, [published in Genome Research](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC187518/). Manual for BLAT can be found at [UCSC page](https://genome.ucsc.edu/goldenpath/help/blatSpec.html). As from the abstract of the in WJ Kent's work<sup>1</sup> BLAT was developed with intend to increase the speed of genomic sequence alignment for the needs of the human genome project. In comparison with [BLAST](https://blast.ncbi.nlm.nih.gov/Blast.cgi)<sup>2</sup>, BLAT is different in few ways:

1. "Where BLAST builds an index of the query sequence and then scans linearly through the database, BLAT builds an index of the database and then scans linearly through the query sequence."
2. "Where BLAST triggers an extension when one or two hits occur in proximity to each other, BLAT can trigger extensions on any number of perfect or near-perfect hits."
3. "Where BLAST returns each area of homology between two sequences as separate alignments, BLAT stitches them together into a larger alignment."

BLAT is available in several forms and I've been using standalone version which I acquired from [here](http://hgdownload.cse.ucsc.edu/admin/exe/). I'm running it on MacBook Pro 2017 (macOS Catalina 10.15.6) and the version of BLAT that I will be using `v.36`.

BLAT was written for aligning mRNA sequences to the whole genome. However, it can be used to align a mRNA or protein sequence (query) against one or several target DNA or protein sequences (database). Once you store your sequences to `query.fa` and `database.fa` files, you can run blat using the following line:

`> blat database.fa query.fa output.pslx -prot -out=pslx`

Parameters are: `-prot` is for running BLAT on proteins (both query and target), `-out=psxl` is the output of BLAT which contains sequences (fragments), and I add `-minScore=0` for removing the default minimum score threshold imposed by BLAT so the command line that I will be using for the rest of this blog post looks like:

`> blat database.fa query.fa output.pslx -prot -out=pslx -minScore=0`

## Protein alignment using BLAT

The problem I am working on is comparing protein sequences between different species with intent to use information I have for species A and map it to species B. Moreover, I am working with 3 species: [zebrafish](https://en.wikipedia.org/wiki/Zebrafish), human and mouse. I would like to map information that I have for human and mouse to zebrafish and moreover, choose between human and mouse, for a _better mapping_ to zebrafish.

The reason I'm using BLAT is because I am specifically interested in aligning DNA-Binding Domains (DBDs) of protein sequences and BLAT allows me to align **blocks** of protein sequences while keeping the [synteny](https://en.wikipedia.org/wiki/Synteny) of sequence blocks DBDs.

For example, I would like to see for zebrafish gene [elk3 (ENSDARG00000018688)](http://www.ensembl.org/Danio_rerio/Gene/Summary?g=ENSDARG00000018688;r=4:7677318-7713665) if it maps better to human [ELK3 (ENSG00000111145)](http://www.ensembl.org/Homo_sapiens/Gene/Summary?g=ENSG00000111145;r=12:96194375-96269824) or mouse [Ekl3 (ENSMUSG00000008398)](http://www.ensembl.org/Mus_musculus/Gene/Summary?g=ENSMUSG00000008398;r=10:93247414-93311135). For that, from [ensembl](https://www.ensembl.org/index.html), we can retrieve principal reference protein sequences and run BLAT on it. Once we have those we run BLAT twice, once for each protein sequence alignment.

1. For Human:

`> blat Homo_sapiens_ELK3_sequence.fa Danio_rerio_elk3_sequence.fa output_hs.pslx -prot -out=pslx -minScore=0`

2. For Mouse:

`> blat Mus_musculus_Elk3_sequence.fa Danio_rerio_elk3_sequence.fa output_mm.pslx -prot -out=pslx -minScore=0`

In both cases, note that `database` is the human or mouse protein sequence, while `query` is the zebrafish protein sequence.

## Analyzing BLAT results

BLAT output result is formatted in the following way:

```
- matches - Number of matching bases that aren't repeats.
- misMatches - Number of bases that don't match.
- repMatches - Number of matching bases that are part of repeats.
- nCount - Number of 'N' bases.
- qNumInsert - Number of inserts in query.
- qBaseInsert - Number of bases inserted into query.
- tNumInsert - Number of inserts in target.
- tBaseInsert - Number of bases inserted into target.
- strand - defined as + (forward) or - (reverse) for query strand.
    In mouse, a second '+' or '-' indecates genomic strand.
- qName - Query sequence name.
- qSize - Query sequence size.
- qStart - Alignment start position in query.
- qEnd - Alignment end position in query.
- tName - Target sequence name.
- tSize - Target sequence size.
- tStart - Alignment start position in target.
- tEnd - Alignment end position in target.
- blockCount - Number of blocks in the alignment.
- blockSizes - Comma-separated list of sizes of each block.
- qStarts - Comma-separated list of start position of each
    block in query.
- tStarts - Comma-separated list of start position of each
    block in target.
- aligned sequences
```

***NB: I used `SearchIO.parse(blat_output_file, "blat-psl", pslx=True)` function from [Bio.SearchIO.BlatIO-module](https://biopython.org/DIST/docs/api/Bio.SearchIO.BlatIO-module.html) module parse BLAT files in python.

In the next two subsections, I will analyze both runs separately.

***NB: for better visibility of the results in the following subsections, it would be good to copy the output to a separate text document.

## Human

Raw BLAT output looks like this:
```
psLayout version 3

match	mis- 	rep. 	N's	Q gap	Q gap	T gap	T gap	strand	Q        	Q   	Q    	Q  	T        	T   	T    	T  	block	blockSizes 	qStarts	 tStarts
     	match	match	   	count	bases	count	bases	      	name     	size	start	end	name     	size	start	end	count
---------------------------------------------------------------------------------------------------------------------------------------------------------------
226	29	0	0	4	129	4	137	+	elk3-202	408	0	384	ELK3-201	407	0	392	5	99,22,12,11,111,	0,139,178,215,273,	0,133,176,236,281,	MESAITLWQFLLQLLLDQSHKHLICWTSNDGEFKLLKSEEVAKLWGLRKNKTNMNYDKLSRALRYYYDKNIIKKVIGQKFVYKFVSFPDILKMDPQAVE,RNEYLHSGLYSSFTVSSLQNPP,EEGQTVIRFVTN,SPCSSRSPSPS,TSSNRLPPKARKPKGLEISAPSILLSGSDLGSIALNSPALPSGSLTPAFFTAQTPSGLLLTPSPLLSSIHFWSSLSPVAPLSPARLQGHSSLFQFPSLLNGPLPVPLPNLD,	MESAITLWQFLLQLLLDQKHEHLICWTSNDGEFKLLKAEEVAKLWGLRKNKTNMNYDKLSRALRYYYDKNIIKKVIGQKFVYKFVSFPEILKMDPHAVE,RNEYIHSGLYSSFTINSLQNPP,EEVRTVIRFVTN,SPFSSRSPSLS,TKSPSLPPKAKKPKGLEISAPPLVLSGTDIGSIALNSPALPSGSLTPAFFTAQTPNGLLLTPSPLLSSIHFWSSLSPVAPLSPARLQGPSTLFQFPTLLNGHMPVPIPSLD,
```

We can see the following details:

- Total of 226 amino acids matching.
- Total of 5 matched syntenic blocks. Starting in zebrafish at `0,139,178,215,273` and in human at `0,133,176,236,281` with lengths `99,22,12,11,111`.


## Mouse

```
psLayout version 3

match	mis- 	rep. 	N's	Q gap	Q gap	T gap	T gap	strand	Q        	Q   	Q    	Q  	T        	T   	T    	T  	block	blockSizes 	qStarts	 tStarts
     	match	match	   	count	bases	count	bases	      	name     	size	start	end	name     	size	start	end	count
---------------------------------------------------------------------------------------------------------------------------------------------------------------
215	31	0	0	3	138	3	148	+	elk3-202	408	0	384	Elk3-201	409	0	394	4	99,24,12,111,	0,137,178,273,	0,131,176,283,	MESAITLWQFLLQLLLDQSHKHLICWTSNDGEFKLLKSEEVAKLWGLRKNKTNMNYDKLSRALRYYYDKNIIKKVIGQKFVYKFVSFPDILKMDPQAVE,ACRNEYLHSGLYSSFTVSSLQNPP,EEGQTVIRFVTN,TSSNRLPPKARKPKGLEISAPSILLSGSDLGSIALNSPALPSGSLTPAFFTAQTPSGLLLTPSPLLSSIHFWSSLSPVAPLSPARLQGHSSLFQFPSLLNGPLPVPLPNLD,	MESAITLWQFLLHLLLDQKHEHLICWTSNDGEFKLLKAEEVAKLWGLRKNKTNMNYDKLSRALRYYYDKNIIKKVIGQKFVYKFVSFPDILKMDPHAVE,ASRNEYLHSGLYSSFTINSLQNAP,EEVRTVIRFVTN,TKSPSLPPKGKKPKGLEISAPQLLLSGTDIGSIALNSPALPSGSLTPAFFTAQTPSGLFLASSPLLPSIHFWSSLSPVAPLSPARLQGPNTLFQFPTLLNGHMPVPLPSLD,
6	0	0	0	0	0	0	0	+	elk3-202	408	251	257	Elk3-201	409	274	280	1	6,	251,	274,	PLNLSS,	PLNLSS,
```

We can see the following details:

- <span style="color:red">**There are two blocks of alignments!**</span>.
- First block with total of 215 amino acids matching.
    - 4 matched syntenic blocks. Starting in zebrafish at `0,137,178,273` and in mouse at `0,131,176,283` with lengths `99,24,12,111`.
- Second block with total of 6 amino acids matching.
    - 1 matched (syntenic) block. Starting in zebrafish at `251` and in mouse at `274` with length of `6`.


## What's happening with this output?

So this is where things get strange. Why does BLAT produce **two** output lines? For that, let's resort to the steps of the algorithm:

1) **Search stage**: BLAT takes tiles of *overlapping* 5 amino acids long blocks from query sequence, and is mapping it to the *non overlapping* 5-mer indexed database. Search stage results in a list of hits ([Section "Clumping Hits and Identifying Homologous Regions"](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC187518/)).
2) **Alignment stage**: hits assembled in 1) are extended into maximally scoring ungapped high scoring alignment (HSPs) using a score function where a match is worth 2 and a mismatch costs 1. (*Note that this part is something we cannot influence!*) Next, a graph of HSPs is built. If HSP A starts before HSP B in *both* query and database, an edge is placed between A and B. The edge is weighted by the score of B minus a gap penalty based on the distance between A dn B. Where A and B overlap, a "crossover" point is selected that maximizes "joining" of two HSPs. Then a dynamic algorithm is run which finds the maximal scoring alignment. This algorithm is applied until all HSPs are connected ([Section "Protein alignment"](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC187518/)).

So, still, we have two clear questions:

1. Why do we have several alignments that are not "stitched" together?
2. Why do we have overlapping alignments?

Answers:

1) What seems to be an "overlapping alignments" does not necessarily overlap in both sequences. It could be overlapping in one while in the other it "falls into" a gap area OR, the whole segment can be "falling into" gap areas in both sequences. This comes from BLAT's attempt to fill in the gaps byt taking _other_ parts of the sequence and "putting" them into those gaps. (["Stitching and Filling In"](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC187518/)). It is hard to see that from .pslx output but once the output is set to .blast, in the alignment, it is clear that that is the case.

If we run:

`> blat Mus_musculus_Elk3_sequence.fa Danio_rerio_elk3_sequence.fa output_mm.pslx -prot -out=pslx -minScore=0`

we get BLAST-like output. Still BLAT, but hits are formatted like BLAST would do it.

```
BLASTP 2.2.11 [blat]

Reference:  Kent, WJ. (2002) BLAT - The BLAST-like alignment tool

Query= elk3-202
         (408 letters)

Database: Mus_musculus_Elk3_sequence.fa 
           1 sequences; 409 total letters

Searching.done
                                                                 Score    E
Sequences producing significant alignments:                      (bits) Value

Elk3-201                                                              195   7e-50
Elk3-201                                                              183   2e-46
Elk3-201                                                               42   9e-04
Elk3-201                                                               18   9e+03
Elk3-201                                                               11   1e+06



>Elk3-201 
          Length = 409

 Score = 195 bits (503), Expect = 7e-50
 Identities = 94/99 (95%), Positives = 96/99 (97%), Gaps = 0/99 (0%)

Query: 1  MESAITLWQFLLQLLLDQSHKHLICWTSNDGEFKLLKSEEVAKLWGLRKNKTNMNYDKLS 60
          MESAITLWQFLL LLLDQ H+HLICWTSNDGEFKLLK+EEVAKLWGLRKNKTNMNYDKLS
Sbjct: 1  MESAITLWQFLLHLLLDQKHEHLICWTSNDGEFKLLKAEEVAKLWGLRKNKTNMNYDKLS 60

Query: 61 RALRYYYDKNIIKKVIGQKFVYKFVSFPDILKMDPQAVE 99
          RALRYYYDKNIIKKVIGQKFVYKFVSFPDILKMDP AVE
Sbjct: 61 RALRYYYDKNIIKKVIGQKFVYKFVSFPDILKMDPHAVE 99


 Score = 183 bits (473), Expect = 2e-46
 Identities = 91/111 (82%), Positives = 100/111 (90%), Gaps = 0/111 (0%)

Query: 274 TSSNRLPPKARKPKGLEISAPSILLSGSDLGSIALNSPALPSGSLTPAFFTAQTPSGLLL 333
           T S  LPPK +KPKGLEISAP +LLSG+D+GSIALNSPALPSGSLTPAFFTAQTPSGL L
Sbjct: 284 TKSPSLPPKGKKPKGLEISAPQLLLSGTDIGSIALNSPALPSGSLTPAFFTAQTPSGLFL 343

Query: 334 TPSPLLSSIHFWSSLSPVAPLSPARLQGHSSLFQFPSLLNGPLPVPLPNLD 384
             SPLL SIHFWSSLSPVAPLSPARLQG ++LFQFP+LLNG +PVPLP+LD
Sbjct: 344 ASSPLLPSIHFWSSLSPVAPLSPARLQGPNTLFQFPTLLNGHMPVPLPSLD 394


 Score = 42 bits (108), Expect = 9e-04
 Identities = 20/24 (83%), Positives = 22/24 (92%), Gaps = 0/24 (0%)

Query: 138 ACRNEYLHSGLYSSFTVSSLQNPP 161
           A RNEYLHSGLYSSFT++SLQN P
Sbjct: 132 ASRNEYLHSGLYSSFTINSLQNAP 155


 Score = 18 bits (47), Expect = 9e+03
 Identities = 10/12 (83%), Positives = 11/12 (92%), Gaps = 0/12 (0%)

Query: 179 EEGQTVIRFVTN 190
           EE +TVIRFVTN
Sbjct: 177 EEVRTVIRFVTN 188


 Score = 11 bits (29), Expect = 1e+06
 Identities = 6/6 (100%), Positives = 6/6 (100%), Gaps = 0/6 (0%)

Query: 252 PLNLSS 257
           PLNLSS
Sbjct: 275 PLNLSS 280

  Database: Mus_musculus_Elk3_sequence.fa
```

Looking at this output, we can check our blocks from the BLAT's pslx output and we see where do they fit in this alignment. Most importantly, we can see that the piece `PLNLSS` seems to be overlapping with the previous matches. That is, from our first HSP, we see that all our sequence fragments fall between `0` and `394` in query (zebrafish) and between `0` and `394` in target (mouse) and in second HSP we have it from `251` to `257` in query and from `274` to `280` in target. So the second HSP overlaps in both sequences. However, from BLAST output we see that both `251-257` in query and `274-280` in target **DO NOT** fall on the sequence themselves but in the gaps in both sequences. Target alignments have a gap between `178-283` (which is labeled bas `Subjct` in BLAST output) and query alignment have a gap between `190-273`.

<span style="color:red">This in turn means the following: the sequence blocks we get **are not stitched together** and are **not syntenic.**</span>

## Conclusion

This simple case of using BLAT for protein-protein alignment provides quite strange output. It seems like BLAT is not doing what it claims to be doing and that is: providing a list of sequence fragments (or blocks) which are syntenic and stitched together into one alignment hit. Granted that I did not run BLAT in default mode and have added `-minScore=0` parameter. Once BLAT is ran without that parameter, the "extra" hit is not shown. However, due to the nature of the problem I am trying solve, I need this parameter, and it's a pity it just breaks the essential idea of BLAT output.

## References

1. [Kent, W. James. "BLAT—the BLAST-like alignment tool." Genome research 12.4 (2002): 656-664.](https://genome.cshlp.org/content/12/4/656)
2. [Altschul, Stephen F., et al. "Basic local alignment search tool." Journal of molecular biology 215.3 (1990): 403-410.](https://www.sciencedirect.com/science/article/pii/S0022283605803602?via%3Dihub)

## Other useful resources

* [https://biopython.org/DIST/docs/api/Bio.SearchIO.BlatIO-module.html](https://biopython.org/DIST/docs/api/Bio.SearchIO.BlatIO-module.html)
* [https://biopython.org/DIST/docs/api/Bio.SearchIO._model.hsp.HSP-class.html](https://biopython.org/DIST/docs/api/Bio.SearchIO._model.hsp.HSP-class.html)
* [https://biopython.org/docs/1.75/api/Bio.SearchIO.BlatIO.html#supported-formats](https://biopython.org/docs/1.75/api/Bio.SearchIO.BlatIO.html#supported-formats)
* [https://biopython.org/wiki/SeqRecord](https://biopython.org/wiki/SeqRecord)
* [http://web-old.archive.org/web/20190808121048/http://bow.web.id/blog/2012/07/initial-blat-support](http://web-old.archive.org/web/20190808121048/http://bow.web.id/blog/2012/07/initial-blat-support)