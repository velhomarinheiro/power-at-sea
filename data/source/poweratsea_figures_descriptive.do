
/* Do file for creating the descriptive figures for Power at Sea version 2.0 */
/* SUR figures are in a separate file */

* open the power at sea v2.0 dataset

* Set the working directory for where you want the files to populate
* Note that the figures use the plottig scheme, which is part of the blindschemes package. 
* ssc install blindschemes

*cd: 

********************************************************************************	


// Figure 1 - Amphibious Tonnage and Amphibious Proportion (Systems Level)

* Create system variables

replace amp_tonFULL = 0 if amp_tonFULL == .
bysort year: egen ampsys_ton = sum(amp_tonFULL)

replace grandtotal_ton = 0 if grandtotal_ton == .
bysort year: egen grandtotsys_ton = sum(grandtotal_ton)

gen amphsys_sys_prop = ampsys_ton/grandtotsys_ton

* graph

sort year
graph twoway ///
	(line ampsys_ton year if year >= 1955 & year <= 2025) ///
	(line amphsys_sys_prop year if year >= 1955 & year <= 2025, yaxis(2) lpattern(dash)), ///
	legend(pos(6) ///
		label(1 "Amphibious System Tonnage") ///
		label(2 "Amphibious System Tonnage Proportion")) ///
	xlabel(1955(10)2025) ///
	xtitle("Year") ytitle("Amphibious System Tonnage") ytitle("Amphibious System Tonnage Proportion", axis(2)) ///
	scheme(plottig)

********************************************************************************	

	
// Figure 2 - System Total of Aircraft Carriers vs Assault Ships, 21st Century

* Create system variables

replace AircraftCarriers = 0 if AircraftCarriers == .
bysort year: egen sys_carriers = sum(AircraftCarriers)

replace assault_ships = 0 if assault_ships == .
bysort year: egen sys_assault = sum(assault_ships)

* graph

sort year
graph twoway ///
	(line sys_assault year if year >= 2000 & year <= 2025) ///
	(line sys_carriers year if year >= 2000 & year <= 2025, lpattern(dash)), ///
	legend(pos(6) ///
		label(1 "Assault Ships") ///
		label(2 "Aircraft Carriers")) ///
	xlabel(2000(5)2025) ///
	xtitle("Year") ytitle("Count") ///
	scheme(plottig)
	
********************************************************************************	
	
	
// Figure 3 - Big Ships at the Systems Level

* generate systems variables
replace bigship10k = 0 if bigship10k == .
bysort year: egen bigship10kbase_tot = sum(bigship10k)

replace bigship7500 = 0 if bigship7500 == .
bysort year: egen bigship7500base_tot = sum(bigship7500)

replace bigship5k = 0 if bigship5k == .
bysort year: egen bigship5kbase_tot = sum(bigship5k)

* keep 2000-2025 data

preserve

keep if inrange(year, 2000, 2025)
sort year

* capture 2000 baseline values

quietly summarize bigship10kbase_tot if year==2000, meanonly
scalar base_10k = r(mean)

quietly summarize bigship7500base_tot if year==2000, meanonly
scalar base_7500 = r(mean)

quietly summarize bigship5kbase_tot if year==2000, meanonly
scalar base_5k = r(mean)

display base_10k base_7500 base_5k

* create percentage-change variables

gen pct_10k   = 100*(bigship10kbase_tot   - base_10k)   / base_10k
gen pct_7500  = 100*(bigship7500base_tot  - base_7500) / base_7500
gen pct_5k    = 100*(bigship5kbase_tot    - base_5k)   / base_5k

* verify 2000=0

list year pct_10k pct_7500 pct_5k if year==2000

* graph system-level percentage-change, 2000-2025

twoway ///
    (line pct_10k   year, lpattern(dash_dot_dot)) ///
    (line pct_7500  year, lpattern(dash)) ///
    (line pct_5k    year, lpattern(solid)), ///
    yline(0, lpattern(shortdash)) ///
    xtitle("") ///
    ytitle("Percent change since 2000") ///
    legend(order(1 "≥10,000 tons" ///
                 2 "≥7,500 tons" ///
                 3 "≥5,000 tons") ///
           ring(0) pos(11)) ///
    title("") ///
	scheme(plottig) ///
	name(f3a, replace)

	

restore

* All Big Ships from 1865-2025

twoway ///
    (line bigship10kbase_tot year if inrange(year,1865,2025), lpattern(dash_dot_dot)) ///
    (line bigship7500base_tot year if inrange(year,1865,2025), lpattern(dash)) ///
    (line bigship5kbase_tot year if inrange(year,1865,2025), lpattern(solid)), ///
    xlabel(1865(20)2025) ///
    legend(off) ///
	xtitle("Year") ytitle("Count") ///
	title("") ///
    scheme(plottig) ///
	name(f3b, replace)
	
	
* Combine the two

graph combine f3a f3b, ///
    cols(1) ///
    title("") ///
    imargin(2 2 2 2) ///
	note("Upper graph covers 2000-2025, lower graph covers 1865-2025")

* Title - System-Level Trends in Large Warships

********************************************************************************	


// Figure 4 - P5 Naval Trends

* create tonnage measure with ballistic subs
capture drop tonnage_ab
gen tonnage_ab = grandtotal_ton+ballsub_ton

replace tonnage_ab = 0 if tonnage_ab == .
by year: egen tonab_sys = sum(tonnage_ab)

gen tonab_prop = tonnage_ab/tonab_sys


* P5 tonnage trends - with ballistic subs

graph twoway ///
	(line tonab_prop year if year >= 2000 & year <= 2025 & cowcode == 2, lpattern(dash)) ///
	(line tonab_prop year if year >= 2000 & year <= 2025 & cowcode == 200, lpattern(dash_dot_dot)) ///
	(line tonab_prop year if year >= 2000 & year <= 2025 & cowcode == 220, lpattern(solid)) ///
	(line tonab_prop year if year >= 2000 & year <= 2025 & cowcode == 365, lpattern("-")) ///
	(line tonab_prop year if year >= 2000 & year <= 2025 & cowcode == 710, lpattern("_.")), ///
	legend(pos(3) cols(1) ///
		label(1 "USA") ///
		label(2 "UK") ///
		label(3 "France") ///
		label(4 "Russia") ///
		label(5 "China")) ///
	xlabel(2000(5)2025) ///
	xtitle("Year") ytitle("Tonnage Proportion (with Ballistic Subs)") ///
	scheme(plottig)


********************************************************************************	


// Figure 5 - Regional Tonnage, 2011 vs 2025

preserve

*-------------------------------
* 1) System tonnage
*-------------------------------
capture drop system_ton
gen double system_ton = grandtotal_ton + ballsub_ton

*-------------------------------
* 2) Keep the two years
*-------------------------------
keep if inlist(year, 2011, 2025)

*-------------------------------
* 3) Region-year totals + shares (no collapse)
*-------------------------------
bys year region: egen double region_ton   = total(system_ton)
bys year:        egen double system_total = total(system_ton)
gen double region_share = 100 * region_ton / system_total

* Keep one row per (year, region)
bys year region: keep if _n==1

*-------------------------------
* 4) Region labels (COW regions)
*-------------------------------
label define region_lbl ///
    1 "Europe" ///
    2 "Middle East" ///
    3 "Africa" ///
    4 "Asia" ///
    5 "Americas", replace
label values region region_lbl

*-------------------------------
* 5) Fixed plot order (top-to-bottom)
*    Americas, Asia, Europe, Middle East, Africa
*-------------------------------
capture drop plot_order
gen byte plot_order = .
replace plot_order = 5 if region==5   // Americas
replace plot_order = 4 if region==4   // Asia
replace plot_order = 3 if region==1   // Europe
replace plot_order = 2 if region==2   // Middle East
replace plot_order = 1 if region==3   // Africa

*-------------------------------
* 6) Graph 2011
*-------------------------------
graph hbar (asis) region_share if year==2011, ///
    over(region, sort(plot_order) descending gap(2) label(labsize(small))) ///
    blabel(bar, format(%4.1f) position(outside) size(small)) ///
    legend(off) ///
    title("2011", size(medsmall)) ///
    graphregion(margin(small)) ///
    plotregion(margin(l=0 r=4 t=0 b=0)) ///
	scheme(plottig) ///
    name(g2011, replace)

*-------------------------------
* 7) Graph 2025
*-------------------------------
graph hbar (asis) region_share if year==2025, ///
    over(region, sort(plot_order) descending gap(2) label(labsize(small))) ///
    blabel(bar, format(%4.1f) position(outside) size(small)) ///
    legend(off) ///
    title("2025", size(medsmall)) ///
    graphregion(margin(small)) ///
    plotregion(margin(l=0 r=6 t=0 b=0)) ///
	scheme(plottig) ///
    name(g2025, replace)

*-------------------------------
* 8) Combine panels (shared x-scale)
*-------------------------------
graph combine g2011 g2025, cols(2) xcommon ///
    graphregion(margin(zero)) ///
    imargin(zero) 

restore

