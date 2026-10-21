/* Do file for creating the descriptive tables for Power at Sea version 2.0 */
/* SUR Models are in a separate file */

* open the power at sea v2.0 dataset

// Table 1 - List of countries with Assault Ships in 2025

sort cowcode year
list cowcode assault_ships if assault_ships > 0 & year == 2025 & !missing(assault_ships)

// Table 2 - DOESN'T INVOLVE DATA

// Table 3 - Tonnage Proportion for Top-10 Naval Powers, 2000 vs 2025
// This will show you the data, the calculations were done in Excel
// Change in proportion calculated as ((new-old)/old)*100 

* 2000
preserve
gsort -tonab_prop
keep if year == 2000

list cowcode tonab_prop tonnage_ab in 1/10
restore

* 2025
preserve
gsort -tonab_prop
keep if year == 2025

list cowcode tonab_prop tonnage_ab in 1/10
restore

// Table 6 - Top 15 Naval Powers of 2025: Tonnage vs Navy Strength

* create tonnage measure with ballistic subs
capture drop tonnage_ab
gen tonnage_ab = grandtotal_ton+ballsub_ton

* tonnage
preserve 
gsort -tonnage_ab
keep if year == 2025

list cowcode tonnage_ab in 1/15
restore

* naval strength
preserve
gsort -navy_strength2
keep if year == 2025

list cowcode navy_strength2 in 1/15
restore
