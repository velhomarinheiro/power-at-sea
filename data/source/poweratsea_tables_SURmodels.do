/* Do file for creating the SUR tables for Power at Sea version 2.0 */
/* Includes Appendix models */

* open sur data file

* set the directory to where you want the tables files to save

* cd:


// Table 4

set more off
sureg (ln_tonnage_china l3.ln_tonnage_china l3.ln_tonnage_japan l3.ln_tonnage_aus l3.ln_tonnage_sk l3.ln_tonnage_india) ///
(ln_tonnage_japan l3.ln_tonnage_japan l3.ln_tonnage_china) ///
(ln_tonnage_aus l3.ln_tonnage_aus l3.ln_tonnage_china) ///
(ln_tonnage_sk l3.ln_tonnage_sk l3.ln_tonnage_china) ///
(ln_tonnage_india l3.ln_tonnage_india l3.ln_tonnage_china) ///
if year >= 2000 ///
, corr

estimates store m1

est restore m1

* 3) Capture the chi-square and p-value returned by Stata
scalar bp_chi2 = e(chi2_bp)
scalar bp_df = e(df_bp)
scalar bp_p = chi2tail(bp_df, bp_chi2)

* 4) Attach them to the stored estimates so esttab can use them
estadd scalar BP_chi2 = bp_chi2 : m1
estadd scalar BP_p    = bp_p    : m1

* returns output within Stata
esttab m1, ///
    unstack ///
    eqlabels("China" "Japan" "Aus" "S.Korea" "India", replace) ///
    collabels(none) ///
	nonumbers ///
	varwidth(28) ///
    cells(b(star fmt(3)) se(par fmt(3))) ///
	star(* 0.10 ** 0.05 *** 0.01) ///
    label compress nogaps nonotes nomtitles ///
    legend varlabels(_cons "Constant") ///
    title("Seemingly Unrelated Regression Models with Tonnage, Asia 2000-2025") ///
    stats(N BP_chi2 BP_p, fmt(0 1 3) labels("N" "Breusch–Pagan Chi^2" "BP p-value")) ///
    noomitted nobase wrap

* will output as a latex file
esttab m1 using tonnage_asia.tex, ///
	tex replace ///
    unstack ///
    eqlabels("China" "Japan" "Aus" "S.Korea" "India", replace) ///
    collabels(none) ///
	nonumbers ///
	varwidth(28) ///
    cells(b(star fmt(3)) se(par fmt(3))) ///
    label compress nogaps nonotes nomtitles ///
    legend varlabels(_cons "Constant") ///
    title("Seemingly Unrelated Regression Models with Tonnage, Asia 2000-2025") ///
    stats(N BP_chi2 BP_p, fmt(0 1 3) labels("N" "Breusch–Pagan Chi^2" "BP p-value")) ///
    noomitted nobase wrap


// Table 5

* argentina and chile naval arms race, 1873-1902
set more off
sureg (ln_tonnage_arg l3.ln_tonnage_arg l3.ln_tonnage_chile) ///
      (ln_tonnage_chile l3.ln_tonnage_chile l3.ln_tonnage_arg) ///
      if year >= 1873 & year <= 1902, corr 

estimates store m2

est restore m2

* 3) Capture the chi-square and p-value returned by Stata
scalar bp_chi2 = e(chi2_bp)
scalar bp_df = e(df_bp)
scalar bp_p = chi2tail(bp_df, bp_chi2)

* 4) Attach them to the stored estimates so esttab can use them
estadd scalar BP_chi2 = bp_chi2 : m2
estadd scalar BP_p    = bp_p    : m2

* Output directly to Stata
esttab m2, ///
    unstack ///
    eqlabels("Argentina" "Chile", replace) ///
    collabels(none) ///
	nonumbers ///
	varwidth(28) ///
    cells(b(star fmt(3)) se(par fmt(3))) ///
	star(* 0.10 ** 0.05 *** 0.01) ///
    label compress nogaps nonotes nomtitles ///
    legend varlabels(_cons "Constant") ///
    title("Seemingly Unrelated Regression Models with Tonnage, S. America 1890-1902") ///
    stats(N BP_chi2 BP_p, fmt(0 1 3) labels("N" "Breusch–Pagan Chi^2" "BP p-value")) ///
    noomitted nobase wrap

* Output as a latex file
esttab m2 using tonnage_sa.tex, ///
	tex replace ///
    unstack ///
    eqlabels("Argentina" "Chile", replace) ///
    collabels(none) ///
	nonumbers ///
	varwidth(28) ///
    cells(b(star fmt(3)) se(par fmt(3))) ///
	star(* 0.10 ** 0.05 *** 0.01) ///
    label compress nogaps nonotes nomtitles ///
    legend varlabels(_cons "Constant") ///
    title("Seemingly Unrelated Regression Models with Tonnage, S. America 1890-1902") ///
    stats(N BP_chi2 BP_p, fmt(0 1 3) labels("N" "Breusch–Pagan Chi^2" "BP p-value")) ///
    noomitted nobase wrap

	  
// Table 7

set more off
sureg (ln_navy_strength2_china l3.ln_navy_strength2_china l3.ln_navy_strength2_japan l3.ln_navy_strength2_aus l3.ln_navy_strength2_sk l3.ln_navy_strength2_india) ///
(ln_navy_strength2_japan l3.ln_navy_strength2_japan l3.ln_navy_strength2_china) ///
(ln_navy_strength2_aus l3.ln_navy_strength2_aus l3.ln_navy_strength2_china) ///
(ln_navy_strength2_sk l3.ln_navy_strength2_sk l3.ln_navy_strength2_china) ///
(ln_navy_strength2_india l3.ln_navy_strength2_india l3.ln_navy_strength2_china) ///
if year >= 2000 ///
, corr

estimates store m3

est restore m3

* 3) Capture the chi-square and p-value returned by Stata
scalar bp_chi2 = e(chi2_bp)
scalar bp_df = e(df_bp)
scalar bp_p = chi2tail(bp_df, bp_chi2)

* 4) Attach them to the stored estimates so esttab can use them
estadd scalar BP_chi2 = bp_chi2 : m3
estadd scalar BP_p    = bp_p    : m3

* Output to Stata
esttab m3, ///
    unstack ///
    eqlabels("China" "Japan" "Aus" "S.Korea" "India", replace) ///
    collabels(none) ///
	nonumbers ///
	varwidth(28) ///
    cells(b(star fmt(3)) se(par fmt(3))) ///
	star(* 0.10 ** 0.05 *** 0.01) ///
    label compress nogaps nonotes nomtitles ///
    legend varlabels(_cons "Constant") ///
    title("Seemingly Unrelated Regression Models with Naval Strength, Asia 2000-2025") ///
    stats(N BP_chi2 BP_p, fmt(0 1 3) labels("N" "Breusch–Pagan Chi^2" "BP p-value")) ///
    noomitted nobase wrap

* Output as a latex file
esttab m3 using navystrength_asia.tex, ///
	tex replace ///
    unstack ///
    eqlabels("China" "Japan" "Aus" "S.Korea" "India", replace) ///
    collabels(none) ///
	nonumbers ///
	varwidth(28) ///
    cells(b(star fmt(3)) se(par fmt(3))) ///
    label compress nogaps nonotes nomtitles ///
    legend varlabels(_cons "Constant") ///
    title("Seemingly Unrelated Regression Models with Naval Strength, Asia 2000-2025") ///
    stats(N BP_chi2 BP_p, fmt(0 1 3) labels("N" "Breusch–Pagan Chi^2" "BP p-value")) ///
    noomitted nobase wrap




// Table 8

set more off
sureg (ln_navy_strength2_arg l3.ln_navy_strength2_arg l3.ln_navy_strength2_chile) ///
(ln_navy_strength2_chile l3.ln_navy_strength2_chile l3.ln_navy_strength2_arg) ///
if year >= 1873 & year <= 1902 ///
, corr 

estimates store m4

est restore m4

* 3) Capture the chi-square and p-value returned by Stata
scalar bp_chi2 = e(chi2_bp)
scalar bp_df = e(df_bp)
scalar bp_p = chi2tail(bp_df, bp_chi2)

* 4) Attach them to the stored estimates so esttab can use them
estadd scalar BP_chi2 = bp_chi2 : m4
estadd scalar BP_p    = bp_p    : m4

* Output to Stata
esttab m4, ///
    unstack ///
    eqlabels("Argentina" "Chile", replace) ///
    collabels(none) ///
	nonumbers ///
	varwidth(28) ///
    cells(b(star fmt(3)) se(par fmt(3))) ///
	star(* 0.10 ** 0.05 *** 0.01) ///
    label compress nogaps nonotes nomtitles ///
    legend varlabels(_cons "Constant") ///
    title("Seemingly Unrelated Regression Models with Naval Strength, S. America 1890-1902") ///
    stats(N BP_chi2 BP_p, fmt(0 1 3) labels("N" "Breusch–Pagan Chi^2" "BP p-value")) ///
    noomitted nobase wrap

* Output as latex file
esttab m4 using navystrength_sa.tex, ///
	tex replace ///
    unstack ///
    eqlabels("Argentina" "Chile", replace) ///
    collabels(none) ///
	nonumbers ///
	varwidth(28) ///
    cells(b(star fmt(3)) se(par fmt(3))) ///
	star(* 0.10 ** 0.05 *** 0.01) ///
    label compress nogaps nonotes nomtitles ///
    legend varlabels(_cons "Constant") ///
    title("Seemingly Unrelated Regression Models with Naval Strength, S. America 1890-1902") ///
    stats(N BP_chi2 BP_p, fmt(0 1 3) labels("N" "Breusch–Pagan Chi^2" "BP p-value")) ///
    noomitted nobase wrap


// Placebo Tests

* No tables
set more off
sureg (ln_tonnage_china l3.ln_tonnage_china l3.ln_tonnage_arg l3.ln_tonnage_bra) ///
(ln_tonnage_arg l3.ln_tonnage_arg l3.ln_tonnage_bra l3.ln_tonnage_china) ///
(ln_tonnage_bra l3.ln_tonnage_bra l3.ln_tonnage_arg l3.ln_tonnage_china) ///
if year >= 2000 ///
, corr 

set more off
sureg (ln_navy_strength2_china l3.ln_navy_strength2_china l3.ln_navy_strength2_arg l3.ln_navy_strength2_bra) ///
(ln_navy_strength2_arg l3.ln_navy_strength2_arg l3.ln_navy_strength2_bra l3.ln_navy_strength2_china) ///
(ln_navy_strength2_bra l3.ln_navy_strength2_bra l3.ln_navy_strength2_arg l3.ln_navy_strength2_china) ///
if year >= 2000 ///
, corr 
	  
// APPENDIX Models

* Asia Naval Race with 5k ton ships
set more off
sureg (ln_bigship5_china l3.ln_bigship5_china l3.ln_bigship5_japan l3.ln_bigship5_aus l3.ln_bigship5_sk l3.ln_bigship5_india) ///
(ln_bigship5_japan l3.ln_bigship5_japan l3.ln_bigship5_china) ///
(ln_bigship5_aus l3.ln_bigship5_aus l3.ln_bigship5_china) ///
(ln_bigship5_sk l3.ln_bigship5_sk l3.ln_bigship5_china) ///
(ln_bigship5_india l3.ln_bigship5_india l3.ln_bigship5_china) ///
if year >= 2000 ///
, corr

estimates store m5

est restore m5

* 3) Capture the chi-square and p-value returned by Stata
scalar bp_chi2 = e(chi2_bp)
scalar bp_df = e(df_bp)
scalar bp_p = chi2tail(bp_df, bp_chi2)

* 4) Attach them to the stored estimates so esttab can use them
estadd scalar BP_chi2 = bp_chi2 : m5
estadd scalar BP_p    = bp_p    : m5

* Stata output
esttab m5, ///
    unstack ///
    eqlabels("China" "Japan" "Aus" "S.Korea" "India", replace) ///
    collabels(none) ///
	nonumbers ///
	varwidth(28) ///
    cells(b(star fmt(3)) se(par fmt(3))) ///
	star(* 0.10 ** 0.05 *** 0.01) ///
    label compress nogaps nonotes nomtitles ///
    legend varlabels(_cons "Constant") ///
    title("Seemingly Unrelated Regression Estimates on Count of 5k Ships, Asia 2000-2025") ///
    stats(N BP_chi2 BP_p, fmt(0 1 3) labels("N" "Breusch–Pagan Chi^2" "BP p-value")) ///
    addnotes("5k Ships are ships that displace at least 5000 tons") ///
    noomitted nobase wrap

* Latex output
esttab m5 using fivek_asia.tex, ///
	tex replace ///
    unstack ///
    eqlabels("China" "Japan" "Aus" "S.Korea" "India", replace) ///
    collabels(none) ///
	nonumbers ///
	varwidth(28) ///
    cells(b(star fmt(3)) se(par fmt(3))) ///
    label compress nogaps nonotes nomtitles ///
    legend varlabels(_cons "Constant") ///
    title("Seemingly Unrelated Regression Estimates on Count of 5k Ships, Asia 2000-2025") ///
    stats(N BP_chi2 BP_p, fmt(0 1 3) labels("N" "Breusch–Pagan Chi^2" "BP p-value")) ///
    addnotes("5k Ships are ships that displace at least 5000 tons") ///
    noomitted nobase wrap
	
  
* Argentina and Chile with 5k ton ships
label var ln_bigship5_arg "Ln(Argentina 5k Ships)"
label var ln_bigship5_chile "Ln(Chile 5k Ships)"

set more off
sureg (ln_bigship5_arg l3.ln_bigship5_arg l3.ln_bigship5_chile) ///
(ln_bigship5_chile l3.ln_bigship5_chile l3.ln_bigship5_arg) ///
if year >= 1890 & year <= 1902 ///
, corr 

estimates store m6

est restore m6

* 3) Capture the chi-square and p-value returned by Stata
scalar bp_chi2 = e(chi2_bp)
scalar bp_df = e(df_bp)
scalar bp_p = chi2tail(bp_df, bp_chi2)

* 4) Attach them to the stored estimates so esttab can use them
estadd scalar BP_chi2 = bp_chi2 : m6
estadd scalar BP_p    = bp_p    : m6

* Stata output
esttab m6, ///
    unstack ///
    eqlabels("Argentina" "Chile", replace) ///
    collabels(none) ///
	nonumbers ///
	varwidth(28) ///
    cells(b(star fmt(3)) se(par fmt(3))) ///
	star(* 0.10 ** 0.05 *** 0.01) ///
    label compress nogaps nonotes nomtitles ///
    legend varlabels(_cons "Constant") ///
    title("Seemingly Unrelated Regression Estimates on Count of 5k Ships, S. America 1890-1902") ///
    stats(N BP_chi2 BP_p, fmt(0 1 3) labels("N" "Breusch–Pagan Chi^2" "BP p-value")) ///
    addnotes("5k Ships are ships that displace at least 5000 tons") ///
    noomitted nobase wrap

* Latex output
esttab m6 using fivek_sa.tex, ///
	tex replace ///
    unstack ///
    eqlabels("Argentina" "Chile", replace) ///
    collabels(none) ///
	nonumbers ///
	varwidth(28) ///
    cells(b(star fmt(3)) se(par fmt(3))) ///
	star(* 0.10 ** 0.05 *** 0.01) ///
    label compress nogaps nonotes nomtitles ///
    legend varlabels(_cons "Constant") ///
    title("Seemingly Unrelated Regression Estimates on Count of 5k Ships, S. America 1890-1902") ///
    stats(N BP_chi2 BP_p, fmt(0 1 3) labels("N" "Breusch–Pagan Chi^2" "BP p-value")) ///
    addnotes("5k Ships are ships that displace at least 5000 tons") ///
    noomitted nobase wrap
	

