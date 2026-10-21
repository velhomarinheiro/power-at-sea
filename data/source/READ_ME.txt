*************************************************
* Some notes for the Power at Sea v2.0 Dataset  *
*************************************************

The v2.0 dataset should now be used in analysis rather than the v1.0 dataset. Version 2.0 is the most up-to-date version of the data and has fixed errors in version 1.0. Those using the v2.0 data should still cite the Crisher and Souva (2014) paper along with the v2.0 citation. 

* New variables
There are numerous new variables included with the v2.0 dataset. Users are strongly encouraged to review the online appendix published with the v2.0 paper describing the different variables before engaging in analysis. 

* Recreating v1.0 totton measure
Version 2.0 has a slightly different approach to measuring a state's overall tonnage. Because of this, the totton measure in the v2.0 dataset (now called base_ton) won't match the v1.0 measure from 2014. This is because the amphibious assault ships have been removed and stored as a separate variable. Those wishing to have a measure more closely matching the v1.0 measure of tonnage should use the base_assault_ton measure. This will not perfectly match the old totton measure for two reasons. One, errors in the v1.0 dataset have been corrected. Two, the v2.0 dataset expanded the coverage of assault ships beyond the US and Spain. 

* Regarding missing data
Note that there is no missing data in the dataset. States either have naval power in the specified categories or they do not. Some states have naval assets smaller than frigates or landing ships, but those are not included in this data. When merging the naval data into existing datasets, any missing naval data between 1865-2025 that arises from the merge should be treated as zeroes (and doubled-checked for merging issues). 