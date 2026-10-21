/* Do file for creating the SUR model figures for Power at Sea version 2.0 */
/* Descriptive figures are in a separate file */

* open sur data file
* Set the working directory for where you want the files to populate
* Note that the figures use the plottig scheme, which is part of the blindschemes package. 
* ssc install blindschemes

*cd: 

// Figure 6 - Asian naval race, 21st century

* run the model from Table 4

set more off
sureg (ln_tonnage_china l3.ln_tonnage_china l3.ln_tonnage_japan l3.ln_tonnage_aus l3.ln_tonnage_sk l3.ln_tonnage_india) ///
(ln_tonnage_japan l3.ln_tonnage_japan l3.ln_tonnage_china) ///
(ln_tonnage_aus l3.ln_tonnage_aus l3.ln_tonnage_china) ///
(ln_tonnage_sk l3.ln_tonnage_sk l3.ln_tonnage_china) ///
(ln_tonnage_india l3.ln_tonnage_india l3.ln_tonnage_china) ///
if year >= 2000 ///
, corr

* Freeze the estimation sample
capture drop esample
gen byte esample = e(sample)

* Use the observed x-range from the estimation sample (neatly rounded)
quietly summarize l3.ln_tonnage_china if esample
local step = 0.25
local xlo  = floor(r(min)/`step')*`step'
local xhi  = ceil(r(max)/`step')*`step'

* Marginal predictions for SK eq. across China's lagged tonnage
margins, at(l3.ln_tonnage_china=(`xlo'(`step')`xhi')) predict(eq(ln_tonnage_sk))

marginsplot, ///
    recast(line) recastci(rarea) ///
    plotopts(lwidth(medthick)) ///
    ciopts(color(%25)) ///
    addplot(scatter ln_tonnage_sk l3.ln_tonnage_china if esample, ms(oh) msize(vsmall) mcolor(gs8) xscale(range(12.75(0.25)14.25)) xlabel(12.75(0.25)14.25) ) ///
    title("South Korea") ///
    xtitle("China Logged Tonnage (t-3)") ///
    ytitle("South Korea Ln Tonnage") ///
    legend(off) ///
	xscale(range(12.75(0.25)14.25)) xlabel(12.75(0.25)14.25) ///
	scheme(plottig)
	
graph save "sk_vs_china.gph", replace
	

* China -> Japan

* Marginal predictions for Japan eq. across China's lagged tonnage
margins, at(l3.ln_tonnage_china=(`xlo'(`step')`xhi')) predict(eq(ln_tonnage_japan))

marginsplot, ///
    recast(line) recastci(rarea) ///
    plotopts(lwidth(medthick)) ///
    ciopts(color(%25)) ///
    addplot( scatter ln_tonnage_japan l3.ln_tonnage_china if esample, ms(oh) msize(vsmall) mcolor(gs8) xscale(range(12.75(0.25)14.25)) xlabel(12.75(0.25)14.25) ) ///
    title("Japan") ///
    xtitle("China Logged Tonnage (t-3)") ///
    ytitle("Japan Ln Tonnage") ///
    legend(off) ///
    xscale(range(12.75(0.25)14.25)) xlabel(12.75(0.25)14.25) ///
	scheme(plottig)
	
graph save "japan_vs_china.gph", replace
	
	
	
* China -> India

* Marginal predictions for India eq. across China's lagged tonnage
margins, at(l3.ln_tonnage_china=(`xlo'(`step')`xhi')) predict(eq(ln_tonnage_india))

marginsplot, ///
    recast(line) recastci(rarea) ///
    plotopts(lwidth(medthick)) ///
    ciopts(color(%25)) ///
    addplot( scatter ln_tonnage_india l3.ln_tonnage_china if esample, ms(oh) msize(vsmall) mcolor(gs8) xscale(range(12.75(0.25)14.25)) xlabel(12.75(0.25)14.25) ) ///
    title("India") ///
    xtitle("China Logged Tonnage (t-3)") ///
    ytitle("India Ln Tonnage") ///
    legend(off) ///
    xscale(range(12.75(0.25)14.25)) xlabel(12.75(0.25)14.25) ///
	scheme(plottig)
	
graph save "india_vs_china.gph", replace


* China -> Australia

* Marginal predictions for AUS eq. across China's lagged tonnage
margins, at(l3.ln_tonnage_china=(`xlo'(`step')`xhi')) predict(eq(ln_tonnage_aus))

marginsplot, ///
    recast(line) recastci(rarea) ///
    plotopts(lwidth(medthick)) ///
    ciopts(color(%25)) ///
    addplot(scatter ln_tonnage_aus l3.ln_tonnage_china if esample, ms(oh) msize(vsmall) mcolor(gs8) xscale(range(12.75(0.25)14.25)) xlabel(12.75(0.25)14.25) ) ///
    title("Australia") ///
    xtitle("China Logged Tonnage (t-3)") ///
    ytitle("Australia Ln Tonnage") ///
    legend(off) ///
    xscale(range(12.75(0.25)14.25)) xlabel(12.75(0.25)14.25) ///
	scheme(plottig)
	
graph save "aus_vs_china.gph", replace


* Make any necessary edits in the graph editor	
graph combine sk_vs_china.gph japan_vs_china.gph aus_vs_china.gph india_vs_china.gph, col(2) ///
    title("Asian Responses to Chinese Logged Naval Tonnage: 2000-2025") ///
    note("Observed (gray), SUR-predicted (line), 95% CI shaded") 
	

// Figure 7 - Argentive vs Chile, 19th century

* argentina and chile naval arms race, 1873-1902
* --- SUR Model ---
set more off
sureg (ln_tonnage_arg l3.ln_tonnage_arg l3.ln_tonnage_chile) ///
      (ln_tonnage_chile l3.ln_tonnage_chile l3.ln_tonnage_arg) ///
      if year >= 1873 & year <= 1902, corr 

* Freeze the estimation sample
capture drop esample
gen byte esample = e(sample)

* Chile -> Argentina

* Use the observed x-range from the estimation sample (neatly rounded)
quietly summarize l3.ln_tonnage_chile if esample
local step = 0.25
local xlo  = floor(r(min)/`step')*`step'
local xhi  = ceil(r(max)/`step')*`step'

* Marginal predictions for Arg eq. across Chile's lagged tonnage
margins, at(l3.ln_tonnage_chile=(`xlo'(`step')`xhi')) predict(eq(ln_tonnage_arg))

marginsplot, ///
    recast(line) recastci(rarea) ///
    plotopts(lwidth(medthick)) ///
    ciopts(color(%25)) ///
    addplot(scatter ln_tonnage_arg l3.ln_tonnage_chile if esample, ms(oh) msize(vsmall) mcolor(gs8) xscale(range(8.5(0.25)10.75)) xlabel(8.5(0.25)10.75) ) ///
    title("Argentina") ///
    xtitle("Chile Logged Tonnage (t-3)") ///
    ytitle("Argentina Ln Tonnage") ///
    legend(off) ///
	xscale(range(8.5(0.25)10.75)) xlabel(8.5(0.25)10.75) ///
	scheme(plottig)

graph save "arg_vs_chile.gph", replace
	

* Argentina -> Chile

* Use the observed x-range from the estimation sample (neatly rounded)
quietly summarize l3.ln_tonnage_arg if esample
local step = 0.25
local xlo  = floor(r(min)/`step')*`step'
local xhi  = ceil(r(max)/`step')*`step'

* Marginal predictions for Arg eq. across Chile's lagged tonnage
margins, at(l3.ln_tonnage_arg=(`xlo'(`step')`xhi')) predict(eq(ln_tonnage_chile))

marginsplot, ///
    recast(line) recastci(rarea) ///
    plotopts(lwidth(medthick)) ///
    ciopts(color(%25)) ///
    addplot(scatter ln_tonnage_chile l3.ln_tonnage_arg if esample, ms(oh) msize(vsmall) mcolor(gs8) xscale(range(8(0.25)11)) xlabel(8(0.25)11) ) ///
    title("Chile") ///
    xtitle("Argentina Logged Tonnage (t-3)") ///
    ytitle("Chile Ln Tonnage") ///
    legend(off) ///
	xscale(range(8(0.25)11)) xlabel(8(0.25)11) ///
	scheme(plottig)

graph save "chile_vs_arg.gph", replace


* Make necessary edits in the graph editor	
graph combine arg_vs_chile.gph chile_vs_arg.gph, row(1) ///
    title("Chile and Argentina Logged Tonnage Responses") ///
    note("Observed (gray), SUR-predicted (line), 95% CI shaded") 