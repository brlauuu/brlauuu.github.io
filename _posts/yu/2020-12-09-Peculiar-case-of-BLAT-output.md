---
layout: post
title: "Neobičan slučaj BLAT izlaza"
author: "Đorđe Relić"
tags: [bioinformatika, poravnanje-sekvenci, alati, "Prevedeno pomoću VI (Claude Opus 5.5)"]
ref: Peculiar-case-of-BLAT-output
---

U ovom blog postu opisaću kako sam koristio BLAT da rešim zadatak poravnanja proteinskih sekvenci.

## BLAT

Za početak, kratak uvod. Blast Like Alignment Tool (BLAT) je alat za poravnanje sekvenci koji je napisao W. James Kent, [objavljen u časopisu Genome Research](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC187518/). Uputstvo za BLAT može se naći na [UCSC stranici](https://genome.ucsc.edu/goldenpath/help/blatSpec.html). Kako stoji u apstraktu rada WJ Kent-a[^1], BLAT je razvijen s namerom da se ubrza poravnanje genomskih sekvenci za potrebe projekta ljudskog genoma. U poređenju sa [BLAST-om](https://blast.ncbi.nlm.nih.gov/Blast.cgi)[^2], BLAT se razlikuje u nekoliko stvari:

1. "Dok BLAST pravi indeks query sekvence i zatim linearno prolazi kroz bazu podataka, BLAT pravi indeks baze podataka i zatim linearno prolazi kroz query sekvencu."
2. "Dok BLAST pokreće proširenje kada se jedan ili dva pogotka pojave blizu jedan drugog, BLAT može da pokrene proširenja na bilo kom broju savršenih ili gotovo savršenih pogodaka."
3. "Dok BLAST vraća svaku oblast homologije između dve sekvence kao zasebno poravnanje, BLAT ih spaja u jedno veće poravnanje."

BLAT je dostupan u nekoliko oblika, a ja sam koristio samostalnu verziju koju sam preuzeo [odavde](http://hgdownload.cse.ucsc.edu/admin/exe/). Pokrećem ga na MacBook Pro 2017 (macOS Catalina 10.15.6), a verzija BLAT-a koju ću koristiti je `v.36`.

BLAT je napisan za poravnanje mRNK sekvenci sa celim genomom. Međutim, može se koristiti i za poravnanje mRNK ili proteinske sekvence (query) sa jednom ili više target DNK ili proteinskih sekvenci (baza podataka). Kada sačuvate sekvence u fajlove `query.fa` i `database.fa`, BLAT možete da pokrenete sledećom linijom:

`> blat database.fa query.fa output.pslx -prot -out=pslx`

Parametri su: `-prot` služi za pokretanje BLAT-a na proteinima (i query i target), `-out=psxl` je izlaz BLAT-a koji sadrži sekvence (fragmente), a ja dodajem i `-minScore=0` da bih uklonio podrazumevani prag minimalnog skora koji BLAT nameće, tako da komandna linija koju ću koristiti u ostatku ovog blog posta izgleda ovako:

`> blat database.fa query.fa output.pslx -prot -out=pslx -minScore=0`

## Poravnanje proteina pomoću BLAT-a

Problem na kojem radim je poređenje proteinskih sekvenci između različitih vrsta, s namerom da informacije koje imam za vrstu A iskoristim i mapiram na vrstu B. Pritom radim sa 3 vrste: [zebricom](https://en.wikipedia.org/wiki/Zebrafish), čovekom i mišem. Informacije koje imam za čoveka i miša želeo bih da mapiram na zebricu i, pritom, da izaberem između čoveka i miša radi _boljeg mapiranja_ na zebricu.

Razlog zbog kog koristim BLAT je to što me posebno zanima poravnanje DNK-vezujućih domena (DBD) proteinskih sekvenci, a BLAT mi omogućava da poravnam **blokove** proteinskih sekvenci uz očuvanje [sintenije](https://en.wikipedia.org/wiki/Synteny) blokova sekvenci DBD-ova.

Na primer, želeo bih da vidim da li se gen zebrice [elk3 (ENSDARG00000018688)](http://www.ensembl.org/Danio_rerio/Gene/Summary?g=ENSDARG00000018688;r=4:7677318-7713665) bolje mapira na ljudski [ELK3 (ENSG00000111145)](http://www.ensembl.org/Homo_sapiens/Gene/Summary?g=ENSG00000111145;r=12:96194375-96269824) ili mišji [Ekl3 (ENSMUSG00000008398)](http://www.ensembl.org/Mus_musculus/Gene/Summary?g=ENSMUSG00000008398;r=10:93247414-93311135). Za to sa [ensembl-a](https://www.ensembl.org/index.html) možemo da preuzmemo glavne referentne proteinske sekvence i da na njima pokrenemo BLAT. Kada ih imamo, BLAT pokrećemo dva puta, jednom za svako poravnanje proteinskih sekvenci.

1. Za čoveka:

`> blat Homo_sapiens_ELK3_sequence.fa Danio_rerio_elk3_sequence.fa output_hs.pslx -prot -out=pslx -minScore=0`

2. Za miša:

`> blat Mus_musculus_Elk3_sequence.fa Danio_rerio_elk3_sequence.fa output_mm.pslx -prot -out=pslx -minScore=0`

U oba slučaja, primetite da je `database` proteinska sekvenca čoveka ili miša, dok je `query` proteinska sekvenca zebrice.

## Analiza BLAT rezultata

Izlazni rezultat BLAT-a formatiran je na sledeći način:

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

***NB: Za parsiranje BLAT fajlova u python-u koristio sam funkciju `SearchIO.parse(blat_output_file, "blat-psl", pslx=True)` iz modula [Bio.SearchIO.BlatIO-module](https://biopython.org/DIST/docs/api/Bio.SearchIO.BlatIO-module.html).

U naredna dva pododeljka analiziraću oba pokretanja zasebno.

***NB: radi bolje preglednosti rezultata u narednim pododeljcima, bilo bi dobro da izlaz kopirate u zaseban tekstualni dokument.

## Čovek

Sirovi BLAT izlaz izgleda ovako:
```
psLayout version 3

match	mis- 	rep. 	N's	Q gap	Q gap	T gap	T gap	strand	Q        	Q   	Q    	Q  	T        	T   	T    	T  	block	blockSizes 	qStarts	 tStarts
     	match	match	   	count	bases	count	bases	      	name     	size	start	end	name     	size	start	end	count
---------------------------------------------------------------------------------------------------------------------------------------------------------------
226	29	0	0	4	129	4	137	+	elk3-202	408	0	384	ELK3-201	407	0	392	5	99,22,12,11,111,	0,139,178,215,273,	0,133,176,236,281,	MESAITLWQFLLQLLLDQSHKHLICWTSNDGEFKLLKSEEVAKLWGLRKNKTNMNYDKLSRALRYYYDKNIIKKVIGQKFVYKFVSFPDILKMDPQAVE,RNEYLHSGLYSSFTVSSLQNPP,EEGQTVIRFVTN,SPCSSRSPSPS,TSSNRLPPKARKPKGLEISAPSILLSGSDLGSIALNSPALPSGSLTPAFFTAQTPSGLLLTPSPLLSSIHFWSSLSPVAPLSPARLQGHSSLFQFPSLLNGPLPVPLPNLD,	MESAITLWQFLLQLLLDQKHEHLICWTSNDGEFKLLKAEEVAKLWGLRKNKTNMNYDKLSRALRYYYDKNIIKKVIGQKFVYKFVSFPEILKMDPHAVE,RNEYIHSGLYSSFTINSLQNPP,EEVRTVIRFVTN,SPFSSRSPSLS,TKSPSLPPKAKKPKGLEISAPPLVLSGTDIGSIALNSPALPSGSLTPAFFTAQTPNGLLLTPSPLLSSIHFWSSLSPVAPLSPARLQGPSTLFQFPTLLNGHMPVPIPSLD,
```

Vidimo sledeće detalje:

- Ukupno 226 aminokiselina se poklapa.
- Ukupno 5 poklopljenih sintenih blokova. Počinju kod zebrice na `0,139,178,215,273`, a kod čoveka na `0,133,176,236,281`, sa dužinama `99,22,12,11,111`.


## Miš

```
psLayout version 3

match	mis- 	rep. 	N's	Q gap	Q gap	T gap	T gap	strand	Q        	Q   	Q    	Q  	T        	T   	T    	T  	block	blockSizes 	qStarts	 tStarts
     	match	match	   	count	bases	count	bases	      	name     	size	start	end	name     	size	start	end	count
---------------------------------------------------------------------------------------------------------------------------------------------------------------
215	31	0	0	3	138	3	148	+	elk3-202	408	0	384	Elk3-201	409	0	394	4	99,24,12,111,	0,137,178,273,	0,131,176,283,	MESAITLWQFLLQLLLDQSHKHLICWTSNDGEFKLLKSEEVAKLWGLRKNKTNMNYDKLSRALRYYYDKNIIKKVIGQKFVYKFVSFPDILKMDPQAVE,ACRNEYLHSGLYSSFTVSSLQNPP,EEGQTVIRFVTN,TSSNRLPPKARKPKGLEISAPSILLSGSDLGSIALNSPALPSGSLTPAFFTAQTPSGLLLTPSPLLSSIHFWSSLSPVAPLSPARLQGHSSLFQFPSLLNGPLPVPLPNLD,	MESAITLWQFLLHLLLDQKHEHLICWTSNDGEFKLLKAEEVAKLWGLRKNKTNMNYDKLSRALRYYYDKNIIKKVIGQKFVYKFVSFPDILKMDPHAVE,ASRNEYLHSGLYSSFTINSLQNAP,EEVRTVIRFVTN,TKSPSLPPKGKKPKGLEISAPQLLLSGTDIGSIALNSPALPSGSLTPAFFTAQTPSGLFLASSPLLPSIHFWSSLSPVAPLSPARLQGPNTLFQFPTLLNGHMPVPLPSLD,
6	0	0	0	0	0	0	0	+	elk3-202	408	251	257	Elk3-201	409	274	280	1	6,	251,	274,	PLNLSS,	PLNLSS,
```

Vidimo sledeće detalje:

- <span style="color:red">**Postoje dva bloka poravnanja!**</span>.
- Prvi blok sa ukupno 215 aminokiselina koje se poklapaju.
    - 4 poklopljena sintena bloka. Počinju kod zebrice na `0,137,178,273`, a kod miša na `0,131,176,283`, sa dužinama `99,24,12,111`.
- Drugi blok sa ukupno 6 aminokiselina koje se poklapaju.
    - 1 poklopljen (sinten) blok. Počinje kod zebrice na `251`, a kod miša na `274`, sa dužinom `6`.


## Šta se dešava sa ovim izlazom?

E, ovde stvari postaju čudne. Zašto BLAT daje **dve** izlazne linije? Da bismo to razumeli, vratimo se koracima algoritma:

1) **Faza pretrage**: BLAT uzima pločice od *preklapajućih* blokova dugih 5 aminokiselina iz query sekvence i mapira ih na bazu podataka indeksiranu *nepreklapajućim* 5-merima. Faza pretrage daje listu pogodaka ([Odeljak "Clumping Hits and Identifying Homologous Regions"](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC187518/)).
2) **Faza poravnanja**: pogoci sakupljeni u 1) proširuju se u poravnanja bez gepova sa maksimalnim, visokim skorom (HSP-ovi), pomoću funkcije skora u kojoj poklapanje vredi 2, a nepoklapanje košta 1. (*Imajte na umu da je ovo deo na koji ne možemo da utičemo!*) Zatim se pravi graf HSP-ova. Ako HSP A počinje pre HSP B *i* u query sekvenci i u bazi podataka, između A i B se postavlja grana. Težina grane je skor B umanjen za kaznu za gep zasnovanu na rastojanju između A i B. Tamo gde se A i B preklapaju, bira se tačka "ukrštanja" koja maksimizuje "spajanje" dva HSP-a. Zatim se pokreće dinamički algoritam koji pronalazi poravnanje sa maksimalnim skorom. Ovaj algoritam se primenjuje dok svi HSP-ovi ne budu povezani ([Odeljak "Protein alignment"](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC187518/)).

Dakle, i dalje imamo dva jasna pitanja:

1. Zašto imamo nekoliko poravnanja koja nisu "spojena"?
2. Zašto imamo preklapajuća poravnanja?

Odgovori:

1) Ono što izgleda kao "preklapajuća poravnanja" ne mora nužno da se preklapa u obe sekvence. Može da se preklapa u jednoj, dok u drugoj "upada" u oblast gepa, ILI ceo segment može da "upada" u oblasti gepova u obe sekvence. To proizlazi iz pokušaja BLAT-a da popuni gepove tako što uzima _druge_ delove sekvence i "ubacuje" ih u te gepove. (["Stitching and Filling In"](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC187518/)). To je teško videti iz .pslx izlaza, ali kada se izlaz podesi na .blast, u poravnanju je jasno da je to slučaj.

Ako pokrenemo:

`> blat Mus_musculus_Elk3_sequence.fa Danio_rerio_elk3_sequence.fa output_mm.pslx -prot -out=pslx -minScore=0`

dobijamo izlaz nalik BLAST-u. I dalje je BLAT, ali su pogoci formatirani onako kako bi to uradio BLAST.

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

Gledajući ovaj izlaz, možemo da proverimo naše blokove iz BLAT-ovog pslx izlaza i da vidimo gde se uklapaju u ovo poravnanje. Najvažnije, vidimo da deo `PLNLSS` izgleda kao da se preklapa sa prethodnim poklapanjima. Naime, iz našeg prvog HSP-a vidimo da svi fragmenti sekvence padaju između `0` i `394` u query sekvenci (zebrica) i između `0` i `394` u target sekvenci (miš), a u drugom HSP-u imamo od `251` do `257` u query sekvenci i od `274` do `280` u target sekvenci. Dakle, drugi HSP se preklapa u obe sekvence. Međutim, iz BLAST izlaza vidimo da i `251-257` u query sekvenci i `274-280` u target sekvenci **NE** padaju na same sekvence, već u gepove u obe sekvence. Poravnanja u target sekvenci imaju gep između `178-283` (koja je u BLAST izlazu označena kao `Subjct`), a poravnanje u query sekvenci ima gep između `190-273`.

<span style="color:red">To pak znači sledeće: blokovi sekvenci koje dobijamo **nisu spojeni** i **nisu sinteni.**</span>

## Zaključak

Ovaj jednostavan slučaj korišćenja BLAT-a za poravnanje protein-protein daje prilično čudan izlaz. Izgleda kao da BLAT ne radi ono što tvrdi da radi, a to je: da pruži listu fragmenata (ili blokova) sekvence koji su sinteni i spojeni u jedan pogodak poravnanja. Doduše, BLAT nisam pokrenuo u podrazumevanom režimu i dodao sam parametar `-minScore=0`. Kada se BLAT pokrene bez tog parametra, "dodatni" pogodak se ne prikazuje. Međutim, zbog prirode problema koji pokušavam da rešim, taj parametar mi je potreban, i šteta je što on jednostavno ruši suštinsku ideju BLAT izlaza.

## Ostali korisni resursi

* [https://biopython.org/DIST/docs/api/Bio.SearchIO.BlatIO-module.html](https://biopython.org/DIST/docs/api/Bio.SearchIO.BlatIO-module.html)
* [https://biopython.org/DIST/docs/api/Bio.SearchIO._model.hsp.HSP-class.html](https://biopython.org/DIST/docs/api/Bio.SearchIO._model.hsp.HSP-class.html)
* [https://biopython.org/docs/1.75/api/Bio.SearchIO.BlatIO.html#supported-formats](https://biopython.org/docs/1.75/api/Bio.SearchIO.BlatIO.html#supported-formats)
* [https://biopython.org/wiki/SeqRecord](https://biopython.org/wiki/SeqRecord)
* [http://web-old.archive.org/web/20190808121048/http://bow.web.id/blog/2012/07/initial-blat-support](http://web-old.archive.org/web/20190808121048/http://bow.web.id/blog/2012/07/initial-blat-support)

## Reference

[^1]: [Kent, W. James. "BLAT—the BLAST-like alignment tool." Genome research 12.4 (2002): 656-664.](https://genome.cshlp.org/content/12/4/656)
[^2]: [Altschul, Stephen F., et al. "Basic local alignment search tool." Journal of molecular biology 215.3 (1990): 403-410.](https://www.sciencedirect.com/science/article/pii/S0022283605803602?via%3Dihub)
