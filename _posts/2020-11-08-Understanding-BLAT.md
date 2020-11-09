# Understanding BLAT

In this blog post, we're covering a peculiar case of BLAT output (v. 36).

Before I get to the weird BLAT output, how and why some HSPs contain several fragments (parts of sequences from the alignment), I'd like to quickly explain parameters I'm using in BLAT and what does that mean. My BLAT call is:

`> blat database.fa query.fa output.pslx -prot -out=pslx -minScore=0`

`-prot` is for running BLAT on proteins. `psxl` is the output of BLAT which contains sequences (fragments). `-minScore=0` is for not letting BLAT discard any hits that our algorithm might include. Other default parameters that are of interest are:

- `-tileSize` with default value of 5 for protein alignment
- `-stepSize` which is same as -tileSize and in this case, also 5.
- `-minMatch` is set for 1 which means that at least one amino acid has to match in a given block/fragments

Now, that said, what we have is an algorithm that has two steps:
1) Search stage: taking tiles of *overlapping* 5 amino acids from query (human/mouse full proteins), and is mapping it to the *non overlapping* 5-mer indexed database (zebrafish full proteins). Search stage results in a list of hits. (Section "Clumping Hits and Identifying Homologous Regions" at https://www.ncbi.nlm.nih.gov/pmc/articles/PMC187518/)
2) Alignment stage: hits assembled in 1) are extended into maximally scoring ungapped high scoring alignment (HSPs) using a score function where a match is worth 2 and a mismatch costs 1. *Note that this part is something I cannot influence!* Next, a graph of HSPs is built. If HSP A starts before HSP B in *both* query and database, an edge is placed between A and B. The edge is weighted by the score of B minus a gap penalty based on the distance between A dn B. Where A and B overlap, a "crossover" point is selected that maximizes "joining" of two HSPs. Then a dynamic algorithm is run which finds the maximal scoring alignment. This algorithm is applied until all HSPs are connected. (Section "Protein alignment" at https://www.ncbi.nlm.nih.gov/pmc/articles/PMC187518/)

So, two questions appear:

1) Why do we have overlapping alignments?
2) Why do we have several alignments that are not "stitched" together?

Answers:

1) What seems to be an "overlapping alignments" is essentially not overlapping in both sequences, but only in one of them. In the other sequence, it is a gap. And that is an attempt of BLAT to fill in the gaps byt taking _other_ parts of the sequence and "putting" them into those gaps. ("Stitching and Filling In" at https://www.ncbi.nlm.nih.gov/pmc/articles/PMC187518/) It is hard to see that from .pslx output but once the output is set to .blast, in the alignment, it is clear that that is the case.

2) Some fragments are stitched together (in the same line), some are not. My guess is that the ones that are not, are just too far apart and instead were broken into several lines. BUT, the important thing is that all HSPs (lines with same target and query ID) are part of one alignment! And if we want to get all matches, or rather, the number of true matches, we 

Important resources:

- https://www.ncbi.nlm.nih.gov/pmc/articles/PMC187518/
- https://genome.ucsc.edu/goldenpath/help/blatSpec.html
- https://biopython.org/docs/1.75/api/Bio.SearchIO.BlatIO.html#supported-formats
- http://web-old.archive.org/web/20190808121048/http://bow.web.id/blog/2012/07/initial-blat-support

## BLAT vs BLAST

BLAT (BLAST-Like Alignment Tool) is an alignment tool that was mainly developed to address the problem of scaling BLAST expressed. More specifically, when we're interested in aligning only blocks (introns) of our query sequence to a given target sequence (or rather a database of target sequences).

Main difference between BLAST and BLAT is the following:

- BLAST builds an *index of the query sequence* and then scans linearly through the database. BLAST triggers an extension (additional sequence alignment) when *one or two hits* occur in proximity to each other. BLAST returns each area of homology between two sequences as separate alignments. BLAST delivers a list of exons sorted by exon size, with alignments extending slightly beyond the edge of each exon.

- BLAT builds an *index of the database* and then scans linearly through the query sequence. BLAT can trigger extensions on *any number of perfect or near-perfect hits*. BLAT stitches different area of homology between two sequences together into a larger alignment. BLAT has special code to handle introns in RNA/DNA alignments. BLAT effectively “un-splices” mRNA onto the genome giving a single alignment that uses each base of the mRNA only once, and which correctly positions splice sites.

Does BLAST have a more deterministic score than BLAT? If yes, why?