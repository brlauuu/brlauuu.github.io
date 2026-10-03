---
layout: post
title: "Usko grlo se pomerilo: uticaj razvoja softvera uz pomoć agenata u farmaceutskoj industriji"
author: "Đorđe Relić"
tags: [razvoj softvera, farmacija, biotehnologija, vi, mišljenje, "Prevedeno pomoću VI (Claude Opus 5.5)"]
ref: the-bottleneck-moved
---

Kao i u svim industrijama, razvoj softvera u farmaceutskoj/biotehnološkoj industriji menja se brzo i nepovratno. Kao neko čiji je osnovni posao usmeren na dizajn i razvoj softvera u ovoj industriji, posmatrao sam kako se moj posao menjao, ali i kako tek treba da se promeni. U ovom tekstu ponudiću kombinaciju neospornih činjenica, ali i svojih mišljenja o tome koji su trenutni problemi i šta bi bilo potrebno da se oni promene.

Tekst će biti podeljen u tri glavna dela i počeće nečim što je prilično poznato: potrebom da se iskoriste svi podaci prisutni u farmaceutskoj industriji i načinima da se to postigne, kao i time kako se silosi, koji ove probleme čine težim, formiraju i učvršćuju kroz softverska rešenja. Drugi deo će poći od te početne premise i fokusirati se na to šta je razvoj vođen agentima do sada uradio za silose i šta može da uradi dalje. I na kraju, šta vidim kao dobar pravac kretanja kada su u pitanju softverska rešenja specijalizovana za farmaceutsku industriju.

## Silosi i pristup podacima

Silosi[^1] u velikim kompanijama su veštački koncepti koji opisuju stvaran problem - odeljenja koja se ponašaju kao da žive u ograđenim vrtovima, ne sarađuju i, što je još važnije, ne dele podatke sa drugim odeljenjima. Tehnički, postojanje jednog takvog odeljenja ili grupe već je dovoljno za postojanje silosa (odeljenje koje je silos i svi ostali), ali je mnogo češće da postoji više takvih silosa. I što je korporacija veća, veća je verovatnoća da takvi silosi postoje.

Silosi se obično ne stvaraju namerno. Evolucija silosa počinje iz najbanalnijeg razloga, a to je da je odeljenje hiperfokusirano na problem koji rešava. Naročito kada su u pitanju istraživačke grupe - cilj date grupe je veoma jasan i grubo se može podeliti u dve grupe: 1) **otkrivanje i validacija meta**, što uključuje razumevanje biologije bolesti radi identifikacije i validacije potencijalnih meta, ili 2) **identifikacija i optimizacija vodećih jedinjenja**, što podrazumeva identifikaciju molekula koji modulišu te mete i njihovu postepenu optimizaciju u pogledu potentnosti, selektivnosti, bezbednosti, farmakokinetike i drugih svojstava potrebnih za dalji razvoj. Sa ova dva cilja na umu, istraživačka grupa zaista gotovo nikada ne razmišlja o različitim načinima da unapredi ili razvije saradnju među odeljenjima. Za to jednostavno ne postoji podsticaj, ali, što je još važnije, nema ni vremena za to kada je hitno pomoći pacijentima.

Iako je ono „jedna veličina **ne** odgovara svima” uglavnom tačno uopšte, kada je reč o softveru u farmaceutskoj industriji, to je naročito tačno. Zato je softver koji razvijaju velika centralizovana odeljenja (poput IT odeljenja) veoma teško brzo razviti i uvesti, prosto zato što ima mnogo zahteva različitih zainteresovanih strana koje treba uklopiti. Uz to, ta raznolikost zahteva često je ili veoma specifična, nedovoljno opisana, promenljive prirode (potreba se brzo menja, ali tek nakon što se rešenje isproba), u suprotnosti sa onim što je ranije razvijeno ili sa onim što traže druge zainteresovane strane, i uvek - veoma hitna.

To je razlog za nastanak takozvanog *shadow IT* [^2]. Ali za razliku od serije, shadow IT u farmaceutskoj industriji je grupa koja zaista najneposrednije osnažuje naučnike u laboratoriji, bilo to dobro ili loše. Shadow IT obično počinje od jednog namenski zaposlenog u malom timu ili od postojećeg člana koji je dovoljno tehnički potkovan da počne da razvija mala softverska rešenja po meri, potpuno prilagođena potrebama naučnika u laboratoriji. Ova rešenja se prave brzo, uz zanemarivanje većine dobrih praksi razvoja softvera, nove funkcionalnosti se dodaju veoma brzo, a cilj je da naučnici budu zadovoljni i osnaženi kroz softver.

Iako ovo zvuči sjajno, kako vreme prolazi, u tom odeljenju ima sve više specijalizovanog softvera i sve više naučnika iz laboratorije koji se navikavaju na taj softver, sve dok on ne postane *de facto* obavezan i neophodan deo radnog procesa naučnika. Ali u stvarnosti, ovaj odeljenjski softver po meri **učvršćuje postojeći silos** i, da stvar bude još zabavnija, ako ne od početka, onda sigurno uskoro, **dobiće svog blizanca razvijenog u nekom drugom odeljenju**. Time na kraju dobijamo mnoštvo softvera koji se koristi u različitim odeljenjima, koji nema implementiran odgovarajući životni ciklus razvoja softvera (SDLC [^3]), jedva se održava, ali je previše kritičan da bi ga se otarasili.

Ovaj softver je ujedno i rešenje za čuvanje i serviranje eksperimentalnih podataka. *Podaci*, a naročito *pristup svim podacima u velikim razmerama*, mokri su san svakog inženjera/naučnika za podatke, a još više od toga, nedostatak takvog pristupa u velikim razmerama sprečava nas da otključamo mnoštvo uvida i skratimo vreme koje se troši u procesu otkrivanja lekova.

**Ali**, softver po meri koji razvija shadow IT rešava samo današnje probleme i one koji će doći sutra. Nema vremena, ni potrebe, da se reši pristup svim podacima u kompaniji. Zapravo, tvrdio bih da je ovo dobar način razmišljanja o problemu, ali o tome ću detaljnije pisati u nekom drugom tekstu.

## Razvoj vođen agentima u farmaceutskoj industriji

Kao što možete pretpostaviti iz prethodnog dela, razvoj vođen agentima najviše osnažuje shadow IT. Razvoj softvera je postao [^4] toliko jeftin da je razvoj internih rešenja po meri izbor o kom ne treba ni razmišljati. Ta rešenja ne samo da rade bolje, već i lepše izgledaju. Isprobavanje različitih ideja i testiranje šta radi a šta ne ide još brže, što zauzvrat još više osnažuje naučnike.

*Istina je* da to proizvodi i više koda koji se ne može održavati [^5] i koji leži unaokolo, ali takođe, pošto je sve tako lako i jeftino, programeri nemaju vremena da se **zaljube u svoje super kul fantastično rešenje**.

Ova romantična veza između programera i njegovog softvera izuzetno je doprinosila učvršćivanju silosa. Prosto zato što, dok je razvoj bio spor, ali i veoma koristan, imam mnogo vremena da vidim koliko je moj softver kul i koristan, a svaka nova funkcionalnost je još jedna strofa ljubavne pesme koju pišem tom softveru. A ako postoji rizik da neko drugo rešenje dolazi da zameni ono koje sam ja napisao, i još više ako ono zaista ne pokriva specifične potrebe grupe sa kojom radim, naravno da ću veoma nerado pristati na tu promenu. Ovo važi za *sav* razvoj softvera, ali u farmaciji je naročito važno, jer je softver toliko prilagođen i poseban.

Razvoj vođen agentima sprečava me da se zaljubim u svoje rešenje **i** omogućava raniju proveru zdravim razumom koliko sam zaljubljen u svoju **ideju rešenja**. Brz ciklus razvoja softvera mnogo brže testira ideje i pokazuje da li je rešenje korisno ili ne. A pošto ga je bilo brzo i jeftino napraviti, nije nikakav problem ni brzo ga baciti.

Brži i lakši razvoj softvera takođe daje više prostora svim vrstama ideja koje su ranije ostajale samo ideje, a ne implementacija. Prosto zato što bi njihov razvoj oduzeo previše vremena, a korist nije bila dovoljno jasna (ili bar oni koji donose odluke nisu bili dovoljno ubeđeni). Sada mogu jednostavno da ih isprobam dajući instrukcije Claude-u tokom pauze za kafu, dok i dalje završavam zadatke za koje me zapravo plaćaju.

I ovo - pravljenje prototipova za dokaz koncepta za lude ideje - **sužava izbor onoga što je usko grlo: provlačenje kroz sve obruče da bi se softver globalno uveo u velikoj kompaniji i integrisao sa postojećim sistemima**. Dok je razvoj softvera bio spor(iji), nije bio stvaran problem to što je trebalo proći proces dobijanja odgovarajućih dozvola, sertifikata i odobrenja pre nego što softver bude pušten u rad. Što se integracije tiče, takođe nije bilo baš vidljivo koliko je vremena trebalo da se ti drugi sistemi pripreme za čitanje/pisanje (bilo kroz implementaciju API slojeva ili kroz njihovo skaliranje). Tome je doprinosila i činjenica da je, ako se vreme ulagalo u pravljenje nekog softvera po meri, postojala i podrška i odobrenje menadžerskih nivoa, koji bi pomogli da se te potrebe proguraju kod drugih zainteresovanih strana i da se stvari brže završe.

Sada kada je vreme razvoja softvera skraćeno i kada se može raditi u slobodno vreme, ovi problemi postaju očigledni. Stoga, moje je mišljenje da:
- Procesi moraju da se poboljšaju ako želimo da proširimo načine na koje imamo koristi od razvoja softvera vođenog agentima.
- Globalni sistemi, koje je obavezno koristiti u celoj organizaciji, poput data lake-ova, sistema za registraciju, baza podataka sa opisima eksperimenata i očitavanjima, moraju biti spremni za skaliranje radi integracija sa visokom propusnošću

## Trenutne konkurentske prednosti i predviđanje sledećih koraka u razvoju softvera u farmaciji

Ovo nas dovodi do pitanja globalno uvedenog softvera koji, iako nije jedna veličina koja odgovara svima, svi zaposleni koji rade sa određenim podacima moraju obavezno da koriste. Primeri takvog softvera su elektronske laboratorijske sveske koje čuvaju detalje protokola eksperimenata, sistemi za registraciju jedinjenja koji čuvaju informacije o dizajniranim lekovima, ili specijalizovana skladišta podataka koja čuvaju podatke snimanja, omiks podatke ili bilo koju drugu vrstu specijalizovanih eksperimentalnih očitavanja. Softverski pejzaž takvih rešenja je ogroman i postoje veliki igrači sa velikim ugovorima koji nude rešenja za ovakve probleme. I, očekivano, svaki od njih sada nudi različite varijante AI rešenja koja će osnažiti naučnike koji koriste te alate.

Međutim, kao i u mnogim drugim industrijama, veoma je verovatno da ova rešenja ili zavise od pristupa modelima vodećih laboratorija *ili* koriste neke lokalno pokretane modele koji su slabiji od vodećih modela.

Uz to, izgleda da je korisnički interfejs izbora čet interfejs [^6]. Prvenstveno zato što omogućava korisniku da slobodnim jezikom izrazi jednostavne i složene zahteve i prepusti aplikaciji, odnosno agentu, da shvati šta je korisnik zaista mislio rečima koje je upotrebio.

Napraviti čet interfejs koji bi u pozadini koristio vodeći model, ili bilo koji drugi model, lokalno ili udaljeno hostovan, nije teško. Teško je postaviti prave zaštitne ograde i nametnuti strukturu tako da:
- Podaci se od korisnika unose u obliku *nesređenog izliva misli*, praćeni slikama, PDF-ovima, Excel i .tsv tabelama, i čuvaju u ispravnoj strukturi koja se može koristiti u daljim koracima
- I da se korisniku serviraju uvidi potkrepljeni podacima, na osnovu oskudno formulisanog pitanja u promptu.

Uz sve to, konkurentska prednost je na strani tima koji je u najboljoj poziciji da pokrije potrebe korisnika. Tim u najboljoj poziciji je onaj koji je najbliži korisniku, koji brzo inovira i iterira brzim tempom, konvergirajući ka najboljem prototipu rešenja koji se kasnije preuzima i razvija u profesionalno rešenje.

Što agent ima više podataka na raspolaganju, to će odgovori biti bolji. Najbolji scenario je da agent ima integracije sa *svim* specijalizovanim sistemima u kompaniji i da može da pruži najinformisanije odgovore.

Dozvoliti AI rešenjima dobavljača da pristupaju bilo kom drugom sistemu osim onog koji sami pružaju zahtevaće mnogo poverenja i još više rada kako bi se osiguralo da AI dobavljača neće uraditi nešto što ne bi trebalo.

Konačno, pošto sada znamo da je pisanje aplikacija zasnovanih na četu (*interfejs*) jeftino i brzo, sve dok imamo pristup **nekom** agentu (*mozgu*) koji može da pristupa sistemima koji podržavaju I/O visoke propusnosti (*strukturi*), lako ćemo praviti nove i poboljšane interfejse i testirati ih sa novim, poboljšanim ili potpuno privatnim i lokalnim, ako hoćete i suverenim, agentima koji rade na našoj mreži ili su dostupni preko API-ja i pokreću ih vodeće laboratorije.

___

Ukratko, kao i svuda, razvoj vođen agentima donosi promene u razvoj softvera u farmaceutskoj industriji. Donosi promene u načinu na koji se softver razvija, a pošto jedan problem više nije problem, pravi spisak uskih grla se sužava. Koliko dobro budemo izlazili na kraj sa tim uskim grlima odrediće stvarnu brzinu promena i napretka kada je u pitanju razvoj softvera u farmaceutskoj industriji.

Najbolji timovi biće oni koji će iskoristiti novu brzinu razvoja softvera da brzo iteriraju kroz prototipove i inovativne ideje i konvergiraju ka najboljem proizvodu, koji će verovatno biti mnogo više prilagođen. Ali za razliku od ranije, stvarno prilagođavanje biće samo u zaštitnim ogradama i inženjeringu pre-prompta čet interfejsa.

Ostatak sistema, platforme i aplikacije koje se globalno koriste u celoj kompaniji, ne idu nikuda, ali će morati da drže korak sa potražnjom za I/O. Uspeh skaliranja u skladu sa ovom potražnjom odrediće koliko se agenti *mogu* iskoristiti i koliko mogu da ubrzaju proces otkrivanja lekova.

Izgradnjom prave strukture u smislu povezivanja i integracije velikih sistema koji čuvaju podatke, i pravih okvira koji guraju napred i dalje razvijaju najkorisnije prototipove, agenti, koji su *mozak* svega toga, postaju veoma zamenljivi, a u slučaju visokih računa, pokretanje jakog lokalnog modela omogućiće kontinuitet maksimalnog korišćenja internih podataka, ali će uz to doneti i privatnost i potpunu kontrolu.

## Reference

[^1]: Iako bih voleo da pričam o ovom [Silo](https://en.wikipedia.org/wiki/Silo_(TV_series)): zapravo pričam o [Information Silo](https://en.wikipedia.org/wiki/Information_silo). Ali definitivno preporučujem seriju Silo!
[^2]: Obećavam da ovo nije _još jedan_ način da vas nateram da gledate seriju, i ne izmišljam ove nazive. To je veoma dobro prihvaćen naziv: [Shadow IT](https://en.wikipedia.org/wiki/Shadow_IT)
[^3]: [Software development life cycle](https://en.wikipedia.org/w/index.php?title=Software_development_life_cycle&redirect=no "Software development life cycle")
[^4]: A cena i dalje pada. Za sada.
[^5]: Ne zato što to nije moguće, već zato što nije prioritet i nije zabavno. Tehnički dug je skoro jednako prihvatljiv kao i državni dug.
[^6]: Za sada. Nekako izgleda da postoje dobre šanse da pređe u glas pre nego što stigne do moždanog implanta. U nekoj (potencijalno ne tako dalekoj) budućnosti.
